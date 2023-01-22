import * as AWS from "aws-sdk";
import { config } from "../config";

import {
  APIGatewayEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from "aws-lambda";

import { v4 as uuid } from "uuid";

import { Order } from "../types";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const correlationId = uuid();
    const method = "create-order.handler";
    const prefix = `${correlationId} - ${method}`;

    console.log(`${prefix} - started`);

    if (!event.body) {
      throw new Error("no order supplied");
    }

    // we take the body (payload) from the event coming through from api gateway
    const item = JSON.parse(event.body);

    // get the table name from config
    const ordersTable = config.get("ddbTableName");

    // note: we wont validate the input with this being a basic example only

    const order: Order = {
      id: uuid(),
      ...item,
    };

    console.log(`${prefix} - create order: ${JSON.stringify(order)}`);

    const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
      TableName: ordersTable,
      Item: order,
    };

    await dynamoDb.put(params).promise();

    // api gateway needs us to return this body (stringified) and the status code
    return {
      body: JSON.stringify(order),
      statusCode: 201,
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};
