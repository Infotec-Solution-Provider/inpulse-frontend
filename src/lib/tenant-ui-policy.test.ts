import { describe, expect, it } from "vitest";
import { canTransferTo, type TenantUiPolicy } from "./tenant-ui-policy";

const policy: TenantUiPolicy = { revision: "test", sharedUserIds: [6, 9, 500], canTransferAttendance: true, canUseAdminTransferTarget: true, excludedOperatorIds: [0, -2, 6, 9, 500] };
describe("optional tenant transfer capabilities", () => {
  it("preserves ordinary tenant behavior when no policy is activated", () => {
    expect(canTransferTo(null, 6)).toBe(true);
    expect(canTransferTo(undefined, -1)).toBe(true);
  });
  it("excludes only explicit transfer targets and preserves the administrator target", () => {
    for (const target of policy.excludedOperatorIds) expect(canTransferTo(policy, target)).toBe(false);
    expect(canTransferTo(policy, -1)).toBe(true);
    expect(canTransferTo(policy, 17)).toBe(true);
    expect(canTransferTo({ ...policy, canUseAdminTransferTarget: false }, -1)).toBe(false);
  });
  it("denies every transfer when the current actor lacks the capability", () => {
    for (const target of [-1, 6, 17]) expect(canTransferTo({ ...policy, canTransferAttendance: false }, target)).toBe(false);
  });
});
