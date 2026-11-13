import { describe,expect,it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import OperatorDashboard,{operatorDashboardCards,operatorDuration,type OperatorDashboardMetrics} from "./operator-dashboard";
import { initialPhoneState } from "./types";
const fixture:OperatorDashboardMetrics={serverNow:"2026-11-13T12:00:00Z",crmDay:"2026-11-13",conversationSeconds:50,attempts:2,pauseSeconds:10,productivePauseSeconds:5,connectedSeconds:null,contacts:null,closedOrders:null,closedOrderValue:null,productivityPercent:null,quotesToClose:null,scheduledCustomers:3,overdueSchedules:1,expectedSeconds:null,expectedSource:null,minimumConversationSeconds:null,incompleteCalls:1,visibility:{orders:false,productivity:false},availability:{}};
describe("personal telephone indicators",()=>{
  it("keeps missing counters distinct from a genuine zero and hides disabled conditional metrics",()=>{
    const cards=operatorDashboardCards(fixture);
    expect(cards.find(([name])=>name==="Contatos")?.[1]).toBe("Indisponível");
    expect(cards.some(([name])=>name==="Pedidos fechados")).toBe(false);
    expect(operatorDuration(null)).toBe("Indisponível");expect(operatorDuration(90061)).toBe("25:01:01");
  });
  it("does not mislabel dialing duration as conversation",()=>{
    const html=renderToStaticMarkup(<OperatorDashboard metrics={fixture} state={null} phone={{...initialPhoneState,phase:"active",startedAt:"2026-11-13T11:00:00Z"}}/>);
    expect(html).toContain("Conversa atual");expect(html).toContain("Indisponível");expect(html).toContain("sem encerramento confirmado");
  });
});
