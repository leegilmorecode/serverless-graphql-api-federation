import { HttpRequest } from "@aws-sdk/protocol-http";
import { Sha256 } from "@aws-crypto/sha256-js";
import { SignatureV4 } from "@aws-sdk/signature-v4";

const v4 = new SignatureV4({
  service: "execute-api",
  region: process.env.AWS_DEFAULT_REGION || "",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    sessionToken: process.env.AWS_SESSION_TOKEN || "",
  },
  sha256: Sha256,
});

export const signRequest = async (request: HttpRequest): Promise<any> => {
  const signedRequest = await v4.sign(request);
  return signedRequest;
};
