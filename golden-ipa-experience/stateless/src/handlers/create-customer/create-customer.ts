import { AppSyncResolverEvent, AppSyncResolverHandler } from "aws-lambda";
import { Customer } from "../../types";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { URL } from "url";
import fetch from "node-fetch";
import { signRequest } from "../../helpers/request-signer";
import { config } from "../../config";

import { v4 as uuid } from "uuid";

type CreateCustomerInput = {
  input: {
    firstName: string;
    surname: string;
  };
};

export const handler: AppSyncResolverHandler<
  CreateCustomerInput,
  Customer
> = async (
  event: AppSyncResolverEvent<CreateCustomerInput, Record<string, any> | null>
): Promise<Customer> => {
  try {
    const correlationId = uuid();
    const method = "create-customer.handler";
    const prefix = `${correlationId} - ${method}`;

    // get the url for the customers domain
    const customersDomainUrl = config.get("customersDomainUrl");

    console.log(`${prefix} - started`);
    console.log(`${prefix} - customersDomainUrl: ${customersDomainUrl}`);

    const { firstName, surname } = event.arguments.input;

    const url = new URL(`${customersDomainUrl}/customers/`);

    // very basic validation here for the demo
    if (!firstName) throw new Error("firstName not supplied");
    if (!surname) throw new Error("surname not supplied");

    // create a new customer using the payload from appsync
    const customer: Customer = {
      firstName,
      surname,
    };

    // create the request which will be signed and sent to the private api via privatelink
    const request = new HttpRequest({
      hostname: url.host, // https://12345.execute-api.eu-west-1.amazonaws.com/
      method: "POST",
      body: JSON.stringify(customer),
      headers: {
        host: url.host,
        "x-consumer-id": "experience-layer-bff", // pass through headers for logging of consumers
      },
      path: url.pathname, // prod/customers/
    });

    console.log(`${prefix} - sending request: ${JSON.stringify(request)}`);

    // sign our request with SigV4 and send
    const signedRequest = await signRequest(request);
    const response = await fetch(url.href, signedRequest);
    const responseJson = (await response.json()) as Customer;

    console.log(
      `${prefix} - request response: ${JSON.stringify(responseJson)}`
    );

    // send the response back to appsync
    return responseJson;
  } catch (error) {
    console.log(`Error: ${error}`);
    throw error;
  }
};
