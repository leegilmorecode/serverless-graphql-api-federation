import * as AWS from "aws-sdk";
import { config } from "../config";

import {
  APIGatewayEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from "aws-lambda";

import { v4 as uuid } from "uuid";

import { Customer } from "../types";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const correlationId = uuid();
    const method = "get-customer.handler";
    const prefix = `${correlationId} - ${method}`;

    console.log(`${prefix} - started`);

    if (!event?.pathParameters)
      throw new Error("no id in the path parameters of the event");

    // we get the specific order id from the path parameters in the event from api gateway
    const { customerId: id } = event.pathParameters;

    // we get the table name from config
    const customersTable = config.get("ddbTableName");

    console.log(`${prefix} - get customer: ${id}`);

    const params: AWS.DynamoDB.DocumentClient.GetItemInput = {
      TableName: customersTable,
      Key: {
        id,
      },
    };

    console.log(`${prefix} - get order: ${id}`);

    const { Item: item } = await dynamoDb.get(params).promise();

    // api gateway needs us to return this body (stringified) and the status code
    return {
      statusCode: 200,
      body: JSON.stringify(item as Customer),
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};
