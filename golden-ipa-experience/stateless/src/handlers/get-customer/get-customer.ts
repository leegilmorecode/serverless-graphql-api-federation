import { AppSyncResolverEvent, AppSyncResolverHandler } from "aws-lambda";
import { Customer, QueryIdArgs } from "../../types";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { URL } from "url";
import fetch from "node-fetch";
import { signRequest } from "../../helpers/request-signer";
import { config } from "../../config";

import { v4 as uuid } from "uuid";

export const handler: AppSyncResolverHandler<QueryIdArgs, Customer> = async (
  event: AppSyncResolverEvent<QueryIdArgs, Record<string, any> | null>
): Promise<Customer> => {
  try {
    const correlationId = uuid();
    const method = "get-customer.handler";
    const prefix = `${correlationId} - ${method}`;

    // get the url for the customers domain
    const customersDomainUrl = config.get("customersDomainUrl");

    console.log(`${prefix} - started`);
    console.log(`${prefix} - customersDomainUrl: ${customersDomainUrl}`);

    const { id } = event.arguments;

    const url = new URL(`${customersDomainUrl}/customers/${id}`);

    // create the request which will be signed and sent to the private api via privatelink
    const request = new HttpRequest({
      hostname: url.host, // https://12345.execute-api.eu-west-1.amazonaws.com/
      method: "GET",
      headers: {
        host: url.host,
        "x-consumer-id": "experience-layer-bff", // pass through headers for logging of consumers
      },
      path: url.pathname, // prod/customers/id
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
