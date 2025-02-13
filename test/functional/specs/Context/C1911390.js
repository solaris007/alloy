import { t } from "testcafe";
import createNetworkLogger from "../../helpers/networkLogger";
import createFixture from "../../helpers/createFixture";
import createAlloyProxy from "../../helpers/createAlloyProxy";
import { orgMainConfigMain } from "../../helpers/constants/configParts";

const networkLogger = createNetworkLogger();

const ID = "C1911390";
const DESCRIPTION = `${ID} - Ensure user-provided fields for context data don't leak across requests.`;

createFixture({
  title: DESCRIPTION,
  requestHooks: [networkLogger.edgeEndpointLogs]
});

test.meta({
  ID,
  SEVERITY: "P0",
  TEST_RUN: "Regression"
});

test(DESCRIPTION, async () => {
  const alloy = createAlloyProxy();
  await alloy.configure(orgMainConfigMain);
  await alloy.sendEvent({
    xdm: {
      device: {
        customDeviceField: "foo"
      },
      environment: {
        customEnvironmentField: "foo"
      },
      implementationDetails: {
        customImplementationDetailsField: "foo"
      },
      placeContext: {
        customPlaceContextField: "foo"
      },
      web: {
        customWebField: "foo"
      }
    }
  });

  await t.expect(networkLogger.edgeEndpointLogs.requests.length).eql(1);

  let parsedBody = JSON.parse(
    networkLogger.edgeEndpointLogs.requests[0].request.body
  );
  let sentXdm = parsedBody.events[0].xdm;

  await t
    .expect(sentXdm.device.customDeviceField)
    .eql("foo", "custom device field incorrectly populated");
  await t
    .expect(sentXdm.environment.customEnvironmentField)
    .eql("foo", "custom environment field incorrectly populated");
  await t
    .expect(sentXdm.implementationDetails.customImplementationDetailsField)
    .eql("foo", "custom implementation details field incorrectly populated");
  await t
    .expect(sentXdm.placeContext.customPlaceContextField)
    .eql("foo", "custom place context field incorrectly populated");
  await t
    .expect(sentXdm.web.customWebField)
    .eql("foo", "custom web field incorrectly populated");

  await alloy.sendEvent({});

  await t.expect(networkLogger.edgeEndpointLogs.requests.length).eql(2);

  parsedBody = JSON.parse(
    networkLogger.edgeEndpointLogs.requests[1].request.body
  );
  sentXdm = parsedBody.events[0].xdm;

  await t
    .expect(sentXdm.device.customDeviceField)
    .notOk("custom device field should be undefined");
  await t
    .expect(sentXdm.environment.customEnvironmentField)
    .notOk("custom environment field should be undefined");
  await t
    .expect(sentXdm.implementationDetails.customImplementationDetailsField)
    .notOk("custom implementation details field should be undefined");
  await t
    .expect(sentXdm.placeContext.customPlaceContextField)
    .notOk("custom place context field should be undefined");
  await t
    .expect(sentXdm.web.customWebField)
    .notOk("custom web field should be undefined");
});
