// WiFi Billing System — front-end demo
// Storage keys
const KEYS = {
  plans: "wifi_plans",
  customers: "wifi_customers",
  usage: "wifi_usage",
  invoices: "wifi_invoices",
  profile: "wifi_profile"
};

// Utilities
const fmtKES = v => `KES ${Number(v || 0).toFixed(2)}`;
const byId = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);
const qsa = sel => Array.from(document.querySelectorAll(sel));
const todayStr = () => new Date().toISOString().slice(0,10);
const uid = () => Math.random().toString(36).slice(2,9);
const store = {
  get: k => JSON.parse(localStorage.getItem(k) || "[]"),
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  getObj: k => JSON.parse(localStorage.getItem(k) || "{}"),
  setObj: (k, v) => localStorage.setItem(k, JSON.stringify(v))
};

// Initial seed
function seedIfEmpty(){
  if(!localStorage.getItem(KEYS.plans)){
    store.set(KEYS.plans, [
      {id: uid(), name:"Home 10Mbps", price:2000, speed:10, capGb:100, durationDays:30, overagePerGb:100},
      {id: uid(), name:"Pro 25Mbps", price:3500, speed:25, capGb:250, durationDays:30, overagePerGb:80}
    ]);
  }
  if(!localStorage.getItem(KEYS.customers)){
    const plans = store.get(KEYS.plans);
    store.set(KEYS.customers, [
      {id: uid(), name:"Jane Doe", phone:"+254700000000", email:"jane@example.com", planId:plans[0].id, mac:"AA:BB:CC:DD:EE:FF", ip:"192.168.1.101", status:"active", startedOn:todayStr()},
      {id: uid(), name:"John Smith", phone:"+254711111111", email:"john@example.com", planId:plans[1].id, mac:"AB:CD:EF:12:34:56", ip:"192.168.1.102", status:"active", startedOn:todayStr()}
    ]);
  }
  if(!localStorage.getItem(KEYS.usage)){ store.set(KEYS.usage, []); }
  if(!localStorage.getItem(KEYS.invoices)){ store.set(KEYS.invoices, []); }
  if(!localStorage.getItem(KEYS.profile)){
    store.setObj(KEYS.profile, {businessName:"Demo ISP", address:"Nakuru, Kenya", phone:"+2547...", taxRate:16});
  }
}

// Tabs
function initTabs(){
  const buttons = qsa(".tabs button");
  const panels = qsa(".tab-panel");
  buttons.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      buttons.forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      panels.forEach(p=>{
        p.classList.toggle("active", p.id === tab);
      });
      refreshAll();
    });
  });
}

// Plans
function renderPlans(){
  const plans = store.get(KEYS.plans);
  const tbody = byId("plans-table");
  tbody.innerHTML = plans.map(p=>{
    return `<tr>
      <td>${p.name}</td>
      <td>${fmtKES(p.price)}</td>
      <td>${p.speed} Mbps</td>
      <td>${p.capGb || "Unlimited"}</td>
      <td>${p.durationDays} days</td>
      <td>${p.overagePerGb ? fmtKES(p.overagePerGb)+"/GB" : "-"}</td>
      <td>
        <button class="ghost" data-edit="${p.id}">Edit</button>
        <button class="danger" data-delete="${p.id}">Delete</button>
      </td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll("[data-edit]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const p = plans.find(x=>x.id===btn.dataset.edit);
      const form = byId("plan-form");
      form.id.value = p.id;
      form.name.value = p.name;
      form.price.value = p.price;
      form.speed.value = p.speed;
      form.capGb.value = p.capGb || "";
      form.durationDays.value = p.durationDays;
      form.overagePerGb.value = p.overagePerGb || "";
    });
  });

  tbody.querySelectorAll("[data-delete]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.delete;
      const next = plans.filter(x=>x.id!==id);
      store.set(KEYS.plans, next);
      // Also detach from customers
      const customers = store.get(KEYS.customers).map(c=> c.planId===id ? {...c, planId:null} : c);
      store.set(KEYS.customers, customers);
      refreshAll();
    });
  });

  // populate selects
  const planOptions = plans.map(p=>`<option value="${p.id}">${p.name} — ${fmtKES(p.price)}</option>`).join("");
  byId("customer-plan-select").innerHTML = `<option value="" disabled selected>Select plan</option>${planOptions}`;
}

function handlePlanForm(){
  const form = byId("plan-form");
  byId("plan-reset").addEventListener("click", ()=> form.id.value = "");
  form.addEventListener("submit", e=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const plans = store.get(KEYS.plans);
    const payload = {
      id: data.id || uid(),
      name: data.name.trim(),
      price: Number(data.price),
      speed: Number(data.speed),
      capGb: data.capGb ? Number(data.capGb) : null,
      durationDays: Number(data.durationDays),
      overagePerGb: data.overagePerGb ? Number(data.overagePerGb) : null
    };
    const idx = plans.findIndex(p=>p.id===data.id);
    if(idx>=0) plans[idx] = payload; else plans.push(payload);
    store.set(KEYS.plans, plans);
    form.reset(); form.id.value="";
    renderPlans();
  });
}

// Customers
function renderCustomers(){
  const plans = store.get(KEYS.plans);
  const customers = store.get(KEYS.customers);
  const tbody = byId("customers-table");
  tbody.innerHTML = customers.map(c=>{
    const plan = plans.find(p=>p.id===c.planId);
    const usageGb = calcUsageForCustomer(c.id);
    return `<tr>
      <td>${c.name}</td>
      <td>${c.phone}</td>
      <td>${plan ? plan.name : "-"}</td>
      <td><span class="tag ${c.status==='active'?'paid':'unpaid'}">${c.status}</span></td>
      <td>${usageGb.toFixed(2)} GB</td>
      <td>
        <button class="ghost" data-edit="${c.id}">Edit</button>
        <button class="danger" data-delete="${c.id}">Delete</button>
      </td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll("[data-edit]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const c = customers.find(x=>x.id===btn.dataset.edit);
      const form = byId("customer-form");
      form.id.value = c.id;
      form.name.value = c.name;
      form.phone.value = c.phone;
      form.email.value = c.email || "";
      form.planId.value = c.planId || "";
      form.mac.value = c.mac || "";
      form.ip.value = c.ip || "";
      form.status.value = c.status || "active";
    });
  });

  tbody.querySelectorAll("[data-delete]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.delete;
      const next = customers.filter(x=>x.id!==id);
      store.set(KEYS.customers, next);
      // remove usage and invoices for this customer
      store.set(KEYS.usage, store.get(KEYS.usage).filter(u=>u.customerId!==id));
      store.set(KEYS.invoices, store.get(KEYS.invoices).filter(inv=>inv.customerId!==id));
      refreshAll();
    });
  });

  // populate selects
  const customerOptions = customers.map(c=>`<option value="${c.id}">${c.name} (${c.phone})</option>`).join("");
  byId("usage-customer-select").innerHTML = `<option value="" disabled selected>Select customer</option>${customerOptions}`;
  byId("invoice-customer-select").innerHTML = `<option value="" disabled selected>Select customer</option>${customerOptions}`;
}

function handleCustomerForm(){
  const form = byId("customer-form");
  byId("customer-reset").addEventListener("click", ()=> form.id.value = "");
  form.addEventListener("submit", e=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const customers = store.get(KEYS.customers);
    const payload = {
      id: data.id || uid(),
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: (data.email || "").trim(),
      planId: data.planId || null,
      mac: (data.mac || "").trim(),
      ip: (data.ip || "").trim(),
      status: data.status || "active",
      startedOn: todayStr()
    };
    const idx = customers.findIndex(c=>c.id===data.id);
    if(idx>=0) customers[idx] = payload; else customers.push(payload);
    store.set(KEYS.customers, customers);
    form.reset(); form.id.value="";
    renderCustomers(); updateKPIs();
  });
}

// Usage
function calcUsageForCustomer(customerId, startDate=null, endDate=null){
  const usage = store.get(KEYS.usage).filter(u=>u.customerId===customerId);
  return usage.filter(u=>{
    if(startDate && u.date < startDate) return false;
    if(endDate && u.date > endDate) return false;
    return true;
  }).reduce((sum,u)=> sum + Number(u.gb || 0), 0);
}

function renderUsage(){
  const customers = store.get(KEYS.customers);
  const usage = store.get(KEYS.usage);
  const tbody = byId("usage-table");
  tbody.innerHTML = usage.map(u=>{
    const c = customers.find(x=>x.id===u.customerId);
    return `<tr>
      <td>${c ? c.name : "-"}</td>
      <td>${Number(u.gb).toFixed(2)}</td>
      <td>${u.date}</td>
      <td><button class="danger" data-del="${u.id}">Delete</button></td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const next = usage.filter(x=>x.id!==btn.dataset.del);
      store.set(KEYS.usage, next);
      renderUsage(); renderCustomers();
    });
  });
}

function handleUsageForm(){
  const form = byId("usage-form");
  form.date.value = todayStr();
  form.addEventListener("submit", e=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const payload = {
      id: uid(),
      customerId: data.customerId,
      gb: Number(data.gb),
      date: data.date
    };
    const usage = store.get(KEYS.usage);
    usage.push(payload);
    store.set(KEYS.usage, usage);
    form.reset(); form.date.value = todayStr();
    renderUsage(); renderCustomers();
  });
}

// Billing
function computeInvoice(customer, plan, startDate, endDate){
  const base = plan ? Number(plan.price) : 0;
  const usedGb = calcUsageForCustomer(customer.id, startDate, endDate);
  let overageGb = 0, overageCost = 0;
  if(plan && plan.capGb){
    overageGb = Math.max(0, usedGb - plan.capGb);
    overageCost = (plan.overagePerGb || 0) * overageGb;
  }
  const subtotal = base + overageCost;
  const profile = store.getObj(KEYS.profile);
  const taxRate = Number(profile.taxRate || 0);
  const tax = subtotal * (taxRate/100);
  const total = subtotal + tax;
  return {base, usedGb, overageGb, overageCost, taxRate, tax, total};
}

function renderInvoices(){
  const invoices = store.get(KEYS.invoices);
  const customers = store.get(KEYS.customers);
  const tbody = byId("invoices-table");
  tbody.innerHTML = invoices.map(inv=>{
    const c = customers.find(x=>x.id===inv.customerId);
    return `<tr>
      <td>${inv.number}</td>
      <td>${c ? c.name : "-"}</td>
      <td>${fmtKES(inv.total)}</td>
      <td>${inv.status}</td>
      <td>${inv.startDate} → ${inv.endDate}</td>
      <td>
        ${inv.status==='unpaid' ? `<button class="primary" data-pay="${inv.id}">Mark paid</button>` : ""}
        <button class="ghost" data-print="${inv.id}">Print</button>
        <button class="danger" data-del="${inv.id}">Delete</button>
      </td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const next = invoices.filter(x=>x.id!==btn.dataset.del);
      store.set(KEYS.invoices, next);
      renderInvoices(); updateKPIs();
    });
  });

  tbody.querySelectorAll("[data-pay]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const inv = invoices.find(x=>x.id===btn.dataset.pay);
      inv.status = "paid";
      inv.paidOn = todayStr();
      store.set(KEYS.invoices, invoices);
      renderInvoices(); updateKPIs();
      showReceipt(inv);
    });
  });

  tbody.querySelectorAll("[data-print]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const inv = invoices.find(x=>x.id===btn.dataset.print);
      showInvoice(inv);
    });
  });

  // Dashboard list
  const dashTbody = byId("dashboard-invoices");
  dashTbody.innerHTML = invoices.slice(-5).reverse().map(inv=>{
    const c = customers.find(x=>x.id===inv.customerId);
    return `<tr>
      <td>${inv.number}</td>
      <td>${c ? c.name : "-"}</td>
      <td>${inv.planName || "-"}</td>
      <td>${fmtKES(inv.total)}</td>
      <td>${inv.status}</td>
      <td>${inv.createdOn}</td>
      <td><button class="ghost" data-print="${inv.id}">Print</button></td>
    </tr>`;
  }).join("");

  dashTbody.querySelectorAll("[data-print]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const inv = invoices.find(x=>x.id===btn.dataset.print);
      showInvoice(inv);
    });
  });
}

function handleInvoiceForm(){
  const form = byId("invoice-form");
  form.startDate.value = todayStr();
  form.endDate.value = todayStr();
  form.addEventListener("submit", e=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const customers = store.get(KEYS.customers);
    const plans = store.get(KEYS.plans);
    const c = customers.find(x=>x.id===data.customerId);
    const plan = plans.find(p=>p.id===c.planId);
    const calc = computeInvoice(c, plan, data.startDate, data.endDate);
    const invoices = store.get(KEYS.invoices);
    const invNum = `INV-${new Date().getFullYear()}-${String(invoices.length+1).padStart(4,"0")}`;
    const inv = {
      id: uid(),
      number: invNum,
      customerId: c.id,
      planId: plan ? plan.id : null,
      planName: plan ? plan.name : null,
      startDate: data.startDate,
      endDate: data.endDate,
      createdOn: todayStr(),
      notes: data.notes || "",
      base: calc.base,
      usedGb: calc.usedGb,
      overageGb: calc.overageGb,
      overageCost: calc.overageCost,
      taxRate: calc.taxRate,
      tax: calc.tax,
      total: calc.total,
      status: "unpaid"
    };
    invoices.push(inv);
    store.set(KEYS.invoices, invoices);
    form.reset(); form.startDate.value=todayStr(); form.endDate.value=todayStr();
    renderInvoices(); updateKPIs();
    showInvoice(inv);
  });
}

// KPIs
function updateKPIs(){
  const invoices = store.get(KEYS.invoices);
  const paid = invoices.filter(i=>i.status==='paid').reduce((sum,i)=> sum+i.total, 0);
  byId("kpi-revenue").textContent = fmtKES(paid);
  byId("kpi-unpaid").textContent = String(invoices.filter(i=>i.status==='unpaid').length);
  const active = store.get(KEYS.customers).filter(c=>c.status==='active').length;
  byId("kpi-active").textContent = String(active);

  byId("rpt-customers").textContent = String(store.get(KEYS.customers).length);
  byId("rpt-plans").textContent = String(store.get(KEYS.plans).length);
  byId("rpt-invoices").textContent = String(invoices.length);
}

// Profile & settings
function renderProfile(){
  const p = store.getObj(KEYS.profile);
  const form = byId("profile-form");
  form.businessName.value = p.businessName || "";
  form.address.value = p.address || "";
  form.phone.value = p.phone || "";
  form.taxRate.value = p.taxRate ?? "";
}
function handleProfileForm(){
  const form = byId("profile-form");
  form.addEventListener("submit", e=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    store.setObj(KEYS.profile, {
      businessName: data.businessName || "",
      address: data.address || "",
      phone: data.phone || "",
      taxRate: data.taxRate ? Number(data.taxRate) : 0
    });
    alert("Profile saved");
    renderProfile();
  });
}
function handleReset(){
  byId("reset-store").addEventListener("click", ()=>{
    if(confirm("Reset ALL data? This cannot be undone.")){
      Object.values(KEYS).forEach(k=>localStorage.removeItem(k));
      seedIfEmpty();
      refreshAll();
    }
  });
}

// Export / import
function initExportImport(){
  byId("export-json").addEventListener("click", ()=>{
    const bundle = {
      profile: store.getObj(KEYS.profile),
      plans: store.get(KEYS.plans),
      customers: store.get(KEYS.customers),
      usage: store.get(KEYS.usage),
      invoices: store.get(KEYS.invoices)
    };
    const blob = new Blob([JSON.stringify(bundle,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `wifi_billing_${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  });

  byId("import-json").addEventListener("click", ()=>{
    byId("import-file").click();
  });
  byId("import-file").addEventListener("change", async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const text = await file.text();
    try{
      const data = JSON.parse(text);
      store.setObj(KEYS.profile, data.profile || {});
      store.set(KEYS.plans, data.plans || []);
      store.set(KEYS.customers, data.customers || []);
      store.set(KEYS.usage, data.usage || []);
      store.set(KEYS.invoices, data.invoices || []);
      refreshAll();
      alert("Import successful");
    }catch(err){
      alert("Invalid JSON file");
    }
    e.target.value = "";
  });
}

// Printing
function showInvoice(inv){
  const customers = store.get(KEYS.customers);
  const plans = store.get(KEYS.plans);
  const profile = store.getObj(KEYS.profile);
  const c = customers.find(x=>x.id===inv.customerId);
  const plan = plans.find(p=>p.id===inv.planId);
  const card = byId("print-card");
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div>
        <h2>${profile.businessName || "Your ISP"}</h2>
        <div>${profile.address || ""}</div>
        <div>${profile.phone || ""}</div>
      </div>
      <div style="text-align:right">
        <div><strong>Invoice</strong> ${inv.number}</div>
        <div>Date: ${inv.createdOn}</div>
      </div>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:12px 0" />
    <div style="display:flex;justify-content:space-between;gap:16px">
      <div>
        <div><strong>Bill to:</strong> ${c ? c.name : "-"}</div>
        <div>${c ? c.phone : ""}</div>
      </div>
      <div>
        <div><strong>Plan:</strong> ${plan ? plan.name : "-"}</div>
        <div><strong>Period:</strong> ${inv.startDate} → ${inv.endDate}</div>
      </div>
    </div>
    <table style="margin-top:12px">
      <thead><tr><th>Description</th><th style="text-align:right">Amount (KES)</th></tr></thead>
      <tbody>
        <tr><td>Base plan fee</td><td style="text-align:right">${fmtKES(inv.base)}</td></tr>
        ${inv.overageGb>0 ? `<tr><td>Overage (${inv.overageGb.toFixed(2)} GB)</td><td style="text-align:right">${fmtKES(inv.overageCost)}</td></tr>` : ""}
        <tr><td>Tax (${inv.taxRate}%)</td><td style="text-align:right">${fmtKES(inv.tax)}</td></tr>
        <tr><td><strong>Total due</strong></td><td style="text-align:right"><strong>${fmtKES(inv.total)}</strong></td></tr>
      </tbody>
    </table>
    ${inv.notes ? `<div style="margin-top:8px"><strong>Notes:</strong> ${inv.notes}</div>` : ""}
    <div style="margin-top:8px"><em>Status: ${inv.status}</em></div>
  `;
  openPrint();
}

function showReceipt(inv){
  const customers = store.get(KEYS.customers);
  const profile = store.getObj(KEYS.profile);
  const c = customers.find(x=>x.id===inv.customerId);
  const card = byId("print-card");
  card.innerHTML = `
    <h2>${profile.businessName || "Your ISP"} — Payment receipt</h2>
    <div>Receipt for invoice ${inv.number}</div>
    <div>Date paid: ${inv.paidOn || todayStr()}</div>
    <hr style="border:none;border-top:1px solid #eee;margin:12px 0" />
    <table>
      <tbody>
        <tr><td>Customer</td><td>${c ? c.name : "-"}</td></tr>
        <tr><td>Phone</td><td>${c ? c.phone : ""}</td></tr>
        <tr><td>Total</td><td><strong>${fmtKES(inv.total)}</strong></td></tr>
        <tr><td>Status</td><td><span>PAID</span></td></tr>
      </tbody>
    </table>
  `;
  openPrint();
}

function openPrint(){
  const overlay = byId("print-overlay");
  overlay.classList.remove("hidden");
}
function closePrint(){
  byId("print-overlay").classList.add("hidden");
}
function initPrint(){
  byId("print-close").addEventListener("click", closePrint);
  byId("print-button").addEventListener("click", ()=> window.print());
}

// Dashboard
function renderDashboard(){
  updateKPIs();
}

// Refresh
function refreshAll(){
  renderPlans();
  renderCustomers();
  renderUsage();
  renderInvoices();
  renderDashboard();
  renderProfile();
}

// Boot
(function(){
  seedIfEmpty();
  initTabs();
  handlePlanForm();
  handleCustomerForm();
  handleUsageForm();
  handleInvoiceForm();
  handleProfileForm();
  initExportImport();
  handleReset();
  initPrint();
  byId("year").textContent = new Date().getFullYear();
  refreshAll();
})();
