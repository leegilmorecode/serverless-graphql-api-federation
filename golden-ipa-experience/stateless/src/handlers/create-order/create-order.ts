import { AppSyncResolverEvent, AppSyncResolverHandler } from "aws-lambda";
import { Order } from "../../types";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { URL } from "url";
import fetch from "node-fetch";
import { signRequest } from "../../helpers/request-signer";
import { config } from "../../config";

import { v4 as uuid } from "uuid";

type CreateOrderInput = {
  input: {
    customerId: string;
    productId: string;
    quantity: number;
  };
};

export const handler: AppSyncResolverHandler<CreateOrderInput, Order> = async (
  event: AppSyncResolverEvent<CreateOrderInput, Record<string, any> | null>
): Promise<Order> => {
  try {
    const correlationId = uuid();
    const method = "create-order.handler";
    const prefix = `${correlationId} - ${method}`;

    // get the url for the orders domain
    const ordersDomainUrl = config.get("ordersDomainUrl");

    console.log(`${prefix} - started`);
    console.log(`${prefix} - ordersDomainUrl: ${ordersDomainUrl}`);

    const { quantity, productId, customerId } = event.arguments.input;

    const url = new URL(`${ordersDomainUrl}/customers/${customerId}/orders/`);

    // very basic validation here for the demo
    if (!quantity) throw new Error("quantity not supplied");
    if (!productId) throw new Error("productId not supplied");
    if (!customerId) throw new Error("customerId not supplied");

    // create a new order using the payload from appsync
    const order: Order = {
      quantity,
      productId,
      customerId,
    };

    // create the request which will be signed and sent to the private api via privatelink
    const request = new HttpRequest({
      hostname: url.host, // https://12345.execute-api.eu-west-1.amazonaws.com/
      method: "POST",
      body: JSON.stringify(order),
      headers: {
        host: url.host,
        "x-consumer-id": "experience-layer-bff", // pass through headers for logging of consumers
      },
      path: url.pathname, // prod/customers/customerId/orders
    });

    console.log(`${prefix} - sending request: ${JSON.stringify(request)}`);

    // sign our request with SigV4 and send
    const signedRequest = await signRequest(request);
    const response = await fetch(url.href, signedRequest);
    const responseJson = (await response.json()) as Order;

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
