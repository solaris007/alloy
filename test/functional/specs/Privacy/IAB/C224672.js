import { t } from "testcafe";
import createNetworkLogger from "../../../helpers/networkLogger";
import { responseStatus } from "../../../helpers/assertions/index";
import createFixture from "../../../helpers/createFixture";
import createResponse from "../../../helpers/createResponse";
import getResponseBody from "../../../helpers/networkLogger/getResponseBody";
import cookies from "../../../helpers/cookies";
import {
  compose,
  orgMainConfigMain,
  consentPending,
  debugEnabled
} from "../../../helpers/constants/configParts";
import { MAIN_CONSENT_COOKIE_NAME } from "../../../helpers/constants/cookies";
import createAlloyProxy from "../../../helpers/createAlloyProxy";
import { IAB_CONSENT_IN_PERSONAL_DATA } from "../../../helpers/constants/consent";

const config = compose(orgMainConfigMain, consentPending, debugEnabled);

const networkLogger = createNetworkLogger();

createFixture({
  title:
    "C224672: Passing the `gdprContainsPersonalData` flag should return in the response.",
  requestHooks: [
    networkLogger.setConsentEndpointLogs,
    networkLogger.edgeEndpointLogs
  ]
});

test.meta({
  ID: "C224672",
  SEVERITY: "P0",
  TEST_RUN: "REGRESSION"
});

test("Test C224672: Passing the `gdprContainsPersonalData` flag should return in the response", async () => {
  const alloy = createAlloyProxy();
  await alloy.configure(config);
  await alloy.setConsent(IAB_CONSENT_IN_PERSONAL_DATA);

  await t.expect(networkLogger.setConsentEndpointLogs.requests.length).eql(1);
  await responseStatus(networkLogger.edgeEndpointLogs.requests, 200);

  const consentRawResponse = JSON.parse(
    getResponseBody(networkLogger.setConsentEndpointLogs.requests[0])
  );

  const consentResponse = createResponse({ content: consentRawResponse });

  // 1. The set-consent response should contain the Consent cookie: { general: in }
  const consentCookieValue = await cookies.get(MAIN_CONSENT_COOKIE_NAME);

  await t.expect(consentCookieValue).ok("No consent cookie found.");
  await t.expect(consentCookieValue).eql("general=in");

  // 2. The ECID should exist in the response payload as well, if queried
  const identityHandle = consentResponse.getPayloadsByType("identity:result");
  const returnedNamespaces = identityHandle.map(i => i.namespace.code);
  await t.expect(identityHandle.length).eql(1);
  await t.expect(returnedNamespaces).contains("ECID");

  await alloy.sendEvent();
  await t.expect(networkLogger.edgeEndpointLogs.requests.length).eql(1);
});
