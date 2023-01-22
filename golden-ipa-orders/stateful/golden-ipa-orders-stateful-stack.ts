import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ec2 from "aws-cdk-lib/aws-ec2";

import { Construct } from "constructs";
import { RemovalPolicy } from "aws-cdk-lib";

export class GoldenIpaOrdersStatefulStack extends cdk.Stack {
  public readonly ordersTable: dynamodb.Table;
  public readonly ordersVpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create the vpc with one private subnet in two AZs
    // note we have no nat gateways as all traffic is using privatelink
    this.ordersVpc = new ec2.Vpc(this, "OrdersVpc", {
      cidr: "10.1.0.0/16",
      natGateways: 0,
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "private-subnet-1",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // add the dynamodb vpc gateway endpoint
    this.ordersVpc.addGatewayEndpoint("DynamoDbEndpoint", {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });

    // create the dynamodb table for orders
    this.ordersTable = new dynamodb.Table(this, "OrdersTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: "ipa-orders-table",
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: false,
      contributorInsightsEnabled: true,
      removalPolicy: RemovalPolicy.DESTROY,
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
    });

    // add the global secondary index which allows us to query orders
    // based on customerId i.e. all orders for a given customer
    this.ordersTable.addGlobalSecondaryIndex({
      indexName: "customerIdIndex",
      partitionKey: { name: "customerId", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
  }
}
