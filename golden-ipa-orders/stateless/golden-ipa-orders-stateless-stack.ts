import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";

import { CfnOutput } from "aws-cdk-lib";

export interface stackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  table: dynamodb.Table;
  accountId: string;
  region: string;
}

export class GoldenIpaOrdersStatelessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: stackProps) {
    super(scope, id, props);

    if (!props?.accountId || !props.table || !props.vpc || !props.region) {
      throw new Error("all props not declared");
    }

    // the create order handler
    const createOrderHandler: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, "CreateOrderHandler", {
        functionName: "create-order-handler",
        runtime: lambda.Runtime.NODEJS_14_X,
        entry: path.join(__dirname, "src/create-order/create-order.ts"),
        memorySize: 1024,
        handler: "handler",
        environment: {
          TABLE_NAME: props.table.tableName,
        },
        bundling: {
          minify: true,
          externalModules: ["aws-sdk"],
        },
        vpc: props.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      });

    // the get orders handler
    const getOrdersHandler: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, "GetOrdersHandler", {
        functionName: "get-orders-handler",
        runtime: lambda.Runtime.NODEJS_14_X,
        entry: path.join(__dirname, "src/get-orders/get-orders.ts"),
        memorySize: 1024,
        handler: "handler",
        environment: {
          TABLE_NAME: props.table.tableName,
        },
        bundling: {
          minify: true,
          externalModules: ["aws-sdk"],
        },
        vpc: props.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      });

    // grant the relevant lambdas access to our dynamodb database
    props.table.grantReadData(getOrdersHandler);
    props.table.grantWriteData(createOrderHandler);

    // this api policy on the private internal domain api states that only requests from the
    // experience layer bff (account id) can be made, although in production we would potentially
    // use vpcendpoint ids here to restrict further.
    const apiPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: ["execute-api:Invoke"],
          principals: [
            new iam.AccountPrincipal(props.accountId), // this is the account which is calling it.
          ],
          resources: [
            // we can tie down authz by: api arn + restapi + stage + method + path
            // if this was split by aws accounts we would do the following to ensure consumers can only call certain endpoints
            // `arn:aws:execute-api:${props.region}:${props.accountId}:resitId/prod/POST/orders/`,
            `arn:aws:execute-api:${props.region}:${props.accountId}:*/*/*/*/`,
          ],
        }),
      ],
    });

    // create the api for the private internal orders (domain api)
    const internalOrdersApi: apigw.RestApi = new apigw.RestApi(
      this,
      "InternalOrdersApi",
      {
        description: "internal orders api",
        restApiName: "internal-orders-api",
        deploy: true,
        policy: apiPolicy, // <-- the api resource policy is added here
        defaultMethodOptions: {
          authorizationType: apigw.AuthorizationType.IAM, // IAM-based authorization
        },
        endpointTypes: [apigw.EndpointType.PRIVATE], // this is a private domain layer api i.e. only accessible from this vpc
        // https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-apis.html
        deployOptions: {
          stageName: "prod",
          dataTraceEnabled: true,
          loggingLevel: apigw.MethodLoggingLevel.INFO,
          tracingEnabled: true,
          metricsEnabled: true,
        },
      }
    );

    // create the customers resource for the internal domain api
    const customers: apigw.Resource =
      internalOrdersApi.root.addResource("customers");

    const customer: apigw.Resource = customers.addResource("{customerId}");
    const orders: apigw.Resource = customer.addResource("orders");

    // add the endpoint for creating an order (post) on /customers/{customerId}/orders/
    orders.addMethod(
      "POST",
      new apigw.LambdaIntegration(createOrderHandler, {
        proxy: true,
        allowTestInvoke: false,
      })
    );

    // add the endpoint for retrieving all customer orders (get) on /customers/{customerId}/orders/
    orders.addMethod(
      "GET",
      new apigw.LambdaIntegration(getOrdersHandler, {
        proxy: true,
        allowTestInvoke: false,
      })
    );

    // output the arn to execute
    new CfnOutput(this, "InternalOrdersApiArnToExecute", {
      value: internalOrdersApi.arnForExecuteApi(),
      description: "The arn to execute for the internal orders api",
      exportName: "internalOrdersApiArnToExecute",
    });

    // output the arn to execute
    new CfnOutput(this, "InternalOrdersApiUrl", {
      value: internalOrdersApi.url,
      description: "The url of the internal orders api",
      exportName: "InternalOrdersApiUrl",
    });

    // output the arn to execute to the file
    new CfnOutput(this, "InternalOrdersRestApiId", {
      value: internalOrdersApi.restApiId,
      description: "The rest api Id internal customerds api",
      exportName: "InternalOrdersRestApiId",
    });
  }
}
