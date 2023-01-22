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
    const method = "create-customer.handler";
    const prefix = `${correlationId} - ${method}`;

    console.log(`${prefix} - started`);

    if (!event.body) {
      throw new Error("no customer supplied");
    }

    // we take the body (payload) from the event coming through from api gateway
    const item = JSON.parse(event.body);

    // we get the table name from config
    const customersTable = config.get("ddbTableName");

    // note: we wont validate the input with this being a basic example only

    const customer: Customer = {
      id: uuid(),
      ...item,
    };

    console.log(`${prefix} - create customer: ${JSON.stringify(customer)}`);

    const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
      TableName: customersTable,
      Item: customer,
    };

    await dynamoDb.put(params).promise();

    // api gateway needs us to return this body (stringified) and the status code
    return {
      body: JSON.stringify(customer),
      statusCode: 201,
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};
