import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ec2 from "aws-cdk-lib/aws-ec2";

import { Construct } from "constructs";
import { RemovalPolicy } from "aws-cdk-lib";

export class GoldenIpaCustomersStatefulStack extends cdk.Stack {
  public readonly customersTable: dynamodb.Table;
  public readonly customersVpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create the vpc with one private subnet in two AZs
    // note we have no nat gatways as all traffic will use private link
    this.customersVpc = new ec2.Vpc(this, "CustomersVpc", {
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
    this.customersVpc.addGatewayEndpoint("DynamoDbEndpoint", {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });

    // create the dynamodb table for customers
    this.customersTable = new dynamodb.Table(this, "CustomersTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: "ipa-customers-table",
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: false,
      contributorInsightsEnabled: true,
      removalPolicy: RemovalPolicy.DESTROY,
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
    });
  }
}
