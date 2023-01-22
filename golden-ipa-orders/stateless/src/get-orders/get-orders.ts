import * as AWS from "aws-sdk";
import { config } from "../config";

import {
  APIGatewayEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from "aws-lambda";

import { v4 as uuid } from "uuid";
import { Orders } from "../types";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const correlationId = uuid();
    const method = "get-orders.handler";
    const prefix = `${correlationId} - ${method}`;

    console.log(`${prefix} - started`);

    if (!event?.pathParameters)
      throw new Error("no customerId in the path parameters of the event");

    // we get the specific id from the path parameters in the event from api gateway
    const { customerId } = event.pathParameters;

    // get the table name from config
    const ordersTable = config.get("ddbTableName");

    console.log(`${prefix} - get orders for customerId: ${customerId}`);

    // get all orders for a given customer using the customerId
    const params: AWS.DynamoDB.DocumentClient.QueryInput = {
      TableName: ordersTable,
      IndexName: "customerIdIndex",
      KeyConditionExpression: "#customerId = :customerId",
      ExpressionAttributeNames: {
        "#customerId": "customerId",
      },
      ExpressionAttributeValues: {
        ":customerId": customerId,
      },
    };

    const { Items: items } = await dynamoDb.query(params).promise();

    // api gateway needs us to return this body (stringified) and the status code
    return {
      statusCode: 200,
      body: JSON.stringify(items ? (items as Orders) : []),
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};
