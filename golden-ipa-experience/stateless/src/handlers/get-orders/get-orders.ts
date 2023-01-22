import { AppSyncResolverEvent, AppSyncResolverHandler } from "aws-lambda";
import { Order, Orders, QueryIdArgs } from "../../types";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { URL } from "url";
import fetch from "node-fetch";
import { signRequest } from "../../helpers/request-signer";
import { config } from "../../config";

import { v4 as uuid } from "uuid";

export const handler: AppSyncResolverHandler<
  QueryIdArgs,
  Orders,
  Order
> = async (
  event: AppSyncResolverEvent<QueryIdArgs, Order | null>
): Promise<Orders> => {
  try {
    const correlationId = uuid();
    const method = "get-orders.handler";
    const prefix = `${correlationId} - ${method}`;

    // get the url for the orders domain
    const ordersDomainUrl = config.get("ordersDomainUrl");

    console.log(`${prefix} - started`);
    console.log(`${prefix} - ordersDomainUrl: ${ordersDomainUrl}`);

    const id = event.source?.id;

    if (!event.source?.id) {
      throw new Error("id not found");
    }

    const url = new URL(`${ordersDomainUrl}customers/${id}/orders`);

    // create the request which will be signed and sent to the private api via privatelink
    const request = new HttpRequest({
      hostname: url.host, // https://12345.execute-api.eu-west-1.amazonaws.com/
      method: "GET",
      headers: {
        host: url.host,
        "x-consumer-id": "experience-layer-bff", // pass through headers for logging of consumers
      },
      path: url.pathname, // prod/customers/id/orders
    });

    console.log(`${prefix} - sending request: ${JSON.stringify(request)}`);

    // sign our request with SigV4 and send
    const signedRequest = await signRequest(request);
    const response = await fetch(url.href, signedRequest);
    const responseJson = (await response.json()) as Orders;

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
