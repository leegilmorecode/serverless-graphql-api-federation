import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { RemovalPolicy } from "aws-cdk-lib";

export class GoldenIpaExperienceStatefulStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create the vpc with one private subnet in two AZs
    // note we dont have any natgateways as all traffic is through privatelink
    this.vpc = new ec2.Vpc(this, "ExperienceLayerVpc", {
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

    // add a security group for the vpc endpoint for all https traffic
    const sg = new ec2.SecurityGroup(this, "ExperienceLayerVpcSg", {
      vpc: this.vpc,
      allowAllOutbound: true,
      securityGroupName: "experience-layer-vpc-sg",
    });
    sg.addIngressRule(ec2.Peer.ipv4("10.1.0.0/16"), ec2.Port.tcp(443));

    // create the vpc endpoint to allow us to talk to the private internal api's
    // without the need for a nat gateway etc. this is powered by privatelink and all
    // traffic remains private on the aws backbone network
    const vpcEndpoint = new ec2.InterfaceVpcEndpoint(
      this,
      "ExternalApiVpcEndpoint",
      {
        vpc: this.vpc,
        service: {
          name: `com.amazonaws.eu-west-1.execute-api`,
          port: 443,
        },
        subnets: this.vpc.selectSubnets({
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }),
        privateDnsEnabled: true,
        securityGroups: [sg],
      }
    );

    vpcEndpoint.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }
}
