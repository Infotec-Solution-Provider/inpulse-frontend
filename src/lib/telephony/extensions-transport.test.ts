import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FrontendUsersService } from "../services/users.service";
import { crmMutationConfig } from "../sdk-local/crm-request-context";
const context = { instance: "reviewed-tenant", token: "reviewed-token" };
afterEach(() => vi.restoreAllMocks());

describe("extension directory transport", () => {
  it("pins tenant and credentials for all administrative mutations", async () => {
    const client = new FrontendUsersService("http://users.fixture");
    const post = vi.spyOn(client.ax,"post").mockResolvedValue({data:{data:{}}});
    const patch = vi.spyOn(client.ax,"patch").mockResolvedValue({data:{data:{}}});
    const remove = vi.spyOn(client.ax,"delete").mockResolvedValue({data:{}});
    await client.createTelephonyExtension({name:"Recepção",extension:"0200"},context);
    await client.changeTelephonyExtension(1,{name:"Recepção",extension:"0200",version:2},context);
    await client.removeTelephonyExtension(1,2,context);
    expect(post).toHaveBeenCalledExactlyOnceWith("/api/telephony/extensions",{name:"Recepção",extension:"0200"},crmMutationConfig(context));
    expect(patch).toHaveBeenCalledExactlyOnceWith("/api/telephony/extensions/1",{name:"Recepção",extension:"0200",version:2},crmMutationConfig(context));
    expect(remove).toHaveBeenCalledExactlyOnceWith("/api/telephony/extensions/1",{...crmMutationConfig(context),data:{version:2}});
  });
  it.each(["create","update","delete"])("does not refresh authentication or retry an unauthorized %s",async operation=>{
    const client=new FrontendUsersService("http://users.fixture");
    const adapter=vi.fn(async(config:InternalAxiosRequestConfig)=>{
      expect(config.headers.get("Authorization")).toBe("Bearer reviewed-token");
      expect(config.headers.get("x-crm-instance")).toBe("reviewed-tenant");
      throw new AxiosError("unauthorized",AxiosError.ERR_BAD_REQUEST,config,undefined,{status:401,statusText:"Unauthorized",headers:{},config,data:{message:"expired"}});
    });
    client.ax.defaults.adapter=adapter;
    const work=operation==="create"?client.createTelephonyExtension({name:"Nome",extension:"200"},context):operation==="update"?client.changeTelephonyExtension(1,{name:"Nome",extension:"200",version:1},context):client.removeTelephonyExtension(1,1,context);
    await expect(work).rejects.toThrow("expired");expect(adapter).toHaveBeenCalledTimes(1);
  });
  it("supports a pinned read without changing the shared auth defaults",async()=>{
    const client=new FrontendUsersService("http://users.fixture");
    const get=vi.spyOn(client.ax,"get").mockResolvedValue({data:{data:[]}});
    await client.getTelephonyExtensions(context);
    expect(get).toHaveBeenCalledExactlyOnceWith("/api/telephony/extensions",crmMutationConfig(context));
  });
});
