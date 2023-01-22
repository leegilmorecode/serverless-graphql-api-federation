import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as iam from "aws-cdk-lib/aws-iam";
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ec2 from "aws-cdk-lib/aws-ec2";

import * as path from "path";

export interface stackProps extends cdk.StackProps {
  ordersDomainUrl: string;
  customersDomainUrl: string;
  ordersDomainExecutionArn: string;
  customersDomainExecutionArn: string;
  region: string;
  vpc: ec2.Vpc;
}

export class GoldenIpaExperienceStatelessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: stackProps) {
    super(scope, id, props);

    if (
      !props?.ordersDomainUrl ||
      !props?.customersDomainUrl ||
      !props?.ordersDomainExecutionArn ||
      !props?.customersDomainExecutionArn ||
      !props?.region ||
      !props?.vpc
    ) {
      throw new Error("all props not declared");
    }

    // create the create order handler for the graphql resolver
    const createOrderHandler: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, "CreateOrdersHandler", {
        functionName: "experience-create-order-handler",
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: path.join(
          __dirname,
          "src/handlers/create-order/create-order.ts"
        ),
        memorySize: 1024,
        handler: "handler",
        bundling: {
          minify: true,
          externalModules: ["aws-sdk"],
        },
        environment: {
          ORDERS_DOMAIN_URL: props.ordersDomainUrl,
        },
        vpc: props.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      });

    // create the get orders handler for the graphql resolver
    const getOrdersHandler: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, "GetOrdersHandler", {
        functionName: "experience-get-orders-handler",
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: path.join(__dirname, "src/handlers/get-orders/get-orders.ts"),
        memorySize: 1024,
        handler: "handler",
        bundling: {
          minify: true,
          externalModules: ["aws-sdk"],
        },
        environment: {
          ORDERS_DOMAIN_URL: props.ordersDomainUrl,
        },
        vpc: props.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      });

    // create the create customer handler for the graphql resolver
    const createCustomerHandler: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, "CreateCustomerHandler", {
        functionName: "experience-create-customer-handler",
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: path.join(
          __dirname,
          "src/handlers/create-customer/create-customer.ts"
        ),
        memorySize: 1024,
        handler: "handler",
        bundling: {
          minify: true,
          externalModules: ["aws-sdk"],
        },
        environment: {
          CUSTOMERS_DOMAIN_URL: props.customersDomainUrl,
        },
        vpc: props.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      });

    // create the get customer handler for the graphql resolver
    const getCustomerHandler: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, "GetCustomerHandler", {
        functionName: "experience-get-customer-handler",
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: path.join(
          __dirname,
          "src/handlers/get-customer/get-customer.ts"
        ),
        memorySize: 1024,
        handler: "handler",
        bundling: {
          minify: true,
          externalModules: ["aws-sdk"],
        },
        environment: {
          CUSTOMERS_DOMAIN_URL: props.customersDomainUrl,
        },
        vpc: props.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      });

    // add a policy to the lambda role to allow it to call the execute api
    // arn of the internal orders/customer domain api's. Each with fine grained access
    createOrderHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:Invoke"],
        resources: [props.ordersDomainExecutionArn],
      })
    );

    getOrdersHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:Invoke"],
        resources: [props.ordersDomainExecutionArn],
      })
    );

    getCustomerHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:Invoke"],
        resources: [props.customersDomainExecutionArn],
      })
    );

    createCustomerHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:Invoke"],
        resources: [props.customersDomainExecutionArn],
      })
    );

    // create the appsync api for our external consumers (web, mobile etc)
    const api = new appsync.GraphqlApi(this, "ExperienceApi", {
      name: "ExperienceApi",
      xrayEnabled: true,
      logConfig: {
        excludeVerboseContent: true,
        fieldLogLevel: appsync.FieldLogLevel.ALL,
      },
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
        },
      },
      schema: appsync.SchemaFile.fromAsset(
        path.join(__dirname, "src/schema/schema.graphql")
      ),
    });

    // create order lambda data source for our resolver
    const createOrderLambdaDataSource: appsync.LambdaDataSource =
      new appsync.LambdaDataSource(this, "CreateOrderLambdaDataSource", {
        api,
        lambdaFunction: createOrderHandler,
        description: "Create Order Lambda Data Source",
        name: "CreateOrderLambdaDataSource",
      });

    // get orders lambda data source for our resolver
    const getOrdersLambdaDataSource: appsync.LambdaDataSource =
      new appsync.LambdaDataSource(this, "GetOrdersLambdaDataSource", {
        api,
        lambdaFunction: getOrdersHandler,
        description: "Get Orders Lambda Data Source",
        name: "GetOrdersLambdaDataSource",
      });

    // get customer lambda data source for our resolver
    const getCustomerLambdaDataSource: appsync.LambdaDataSource =
      new appsync.LambdaDataSource(this, "GetCustomerLambdaDataSource", {
        api,
        lambdaFunction: getCustomerHandler,
        description: "Get Customer Lambda Data Source",
        name: "GetCustomerLambdaDataSource",
      });

    // create customer lambda data source for our resolver
    const createCustomerLambdaDataSource: appsync.LambdaDataSource =
      new appsync.LambdaDataSource(this, "CreateCustomerLambdaDataSource", {
        api,
        lambdaFunction: createCustomerHandler,
        description: "Create Customer Lambda Data Source",
        name: "CreateCustomerLambdaDataSource",
      });

    // create order resolver going directly to lambda
    createOrderLambdaDataSource.createResolver("CreateOrderResolver", {
      typeName: "Mutation",
      fieldName: "createOrder",
    });

    // get orders resolver going directly to lambda
    getOrdersLambdaDataSource.createResolver("GetOrdersResolver", {
      typeName: "Customer",
      fieldName: "orders", // this is specific to the fieldname 'orders'
    });

    // create customer resolver going directly to lambda
    createCustomerLambdaDataSource.createResolver("CreateCustomerResolver", {
      typeName: "Mutation",
      fieldName: "createCustomer",
    });

    // get customer resolver going directly to lambda
    getCustomerLambdaDataSource.createResolver("GetCustomerResolver", {
      typeName: "Query",
      fieldName: "getCustomer",
    });
  }
}
