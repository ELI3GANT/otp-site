const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

async function main() {
  const utils = await import('../client-portal-utils.js');
  const portalV2 = await import('../client-portal-v2.js');
  const renderer = fs.readFileSync(path.join(__dirname, '../client-portal-v2-renderer.js'), 'utf8').replace('export function', 'function');
  const fixture = {
    ok: true,
    profile: { clientName: 'Sample Client', businessName: 'Northstar Studio' },
    project: { title: 'Sample website', serviceType: 'Website design', status: 'In Progress' },
    payment: { status: 'Deposit Paid', total: '$600.00', deposit: '$300.00', remaining: '$300.00', paymentLinkReady: false },
    documents: [
      { type: 'Invoice', label: 'Invoice', status: 'ready', preview: '# Sample invoice\nRemaining: $300.00\n<script>unsafe()</script>' },
      { type: 'Proposal', label: 'Proposal', ready: true, status: 'needs-info', preview: 'MUST NOT DISPLAY BLOCKED PREVIEW' }
    ],
    deliverables: { items: ['Responsive website'] }
  };
  const before = JSON.stringify(fixture);
  const dom = new JSDOM('<main id="portal-root"></main><span id="portal-status"></span>', { url: 'https://www.onlytrueperspective.tech/client/sample-private-invite', runScripts: 'outside-only' });
  const requests = [];
  dom.window.fetch = async (url, options = {}) => {
    requests.push({ url, method: options.method || 'GET' });
    return { ok: true, json: async () => fixture };
  };
  Object.assign(dom.window, utils, portalV2);
  dom.window.sharedCleanPortalToken = utils.cleanPortalToken;
  const source = fs.readFileSync(path.join(__dirname, '../client.js'), 'utf8').replace(/^import[\s\S]*?from ['"][^'"]+['"];\s*/gm, '');
  const sections = fs.readFileSync(path.join(__dirname, '../portal-sections.js'), 'utf8').replace('export function', 'function');
  vm.runInContext(sections, dom.getInternalVMContext());
  vm.runInContext(renderer, dom.getInternalVMContext());
  vm.runInContext(source, dom.getInternalVMContext());
  await new Promise(resolve => setImmediate(resolve));
  const root = dom.window.document.getElementById('portal-root');
  assert.match(root.textContent, /Sample Client/);
  assert.match(root.textContent, /Northstar Studio/);
  assert.match(root.textContent, /Remaining balance\$300\.00/);
  assert.doesNotMatch(root.textContent, /\$0\.00|Valued Client|MUST NOT DISPLAY/);
  assert.ok(root.querySelector('.portal-v2-masthead'), 'profile-shaped live payloads use the redesigned v2 workspace');
  assert.equal(root.querySelector('script'), null, 'document previews render as text, never HTML');
  assert.equal(root.querySelectorAll('details').length, 1, 'full project details stay optional behind a disclosure');
  const invoice = [...root.querySelectorAll('.portal-v2-document')].find(item => item.textContent.includes('Invoice'));
  const view = [...invoice.querySelectorAll('a')].find(link => link.textContent.includes('View document'));
  assert.match(view.href, /\/api\/client\/portal\/sample-private-invite\/documents\/invoice\/view$/);
  const download = [...invoice.querySelectorAll('a')].find(link => link.textContent.includes('Download PDF'));
  assert.match(download.href, /\/api\/client\/portal\/sample-private-invite\/documents\/invoice\/pdf$/);
  assert.equal(download.referrerPolicy, 'no-referrer', 'PDF actions do not forward the private invite as a referrer');
  const proposal = [...root.querySelectorAll('.portal-v2-document')].find(item => item.textContent.includes('Proposal'));
  assert.equal(proposal.querySelector('a'), null, 'a blocked readiness state overrides a stale ready flag');
  assert.equal(root.querySelectorAll('a[href^="https://checkout"]').length, 0);
  assert.equal(dom.window.document.getElementById('portal-status').textContent, 'Portal Active');
  assert.deepEqual(requests, [{ url: 'https://www.onlytrueperspective.tech/api/client-portal/sample-private-invite', method: 'GET' }]);
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  assert.deepEqual(tabs.map(tab => tab.textContent), ['Overview', 'Project', 'Documents', 'Billing', 'Support']);
  for (const tab of tabs) {
    tab.click();
    assert.equal(root.querySelectorAll('[role="tabpanel"]:not([hidden])').length, 1);
    assert.equal(root.querySelector('[role="tabpanel"]:not([hidden])').id, tab.getAttribute('aria-controls'));
    assert.equal(tab.getAttribute('aria-selected'), 'true');
    assert.equal(tab.tabIndex, 0);
  }
  tabs[4].dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
  assert.equal(tabs[0].getAttribute('aria-selected'), 'true', 'keyboard wraps to first section');
  tabs[0].dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'End', bubbles: true}));
  assert.equal(dom.window.document.activeElement, tabs[4], 'End selects and focuses support');
  tabs[3].click();
  [...root.querySelectorAll('button')].find(button => button.textContent === 'Refresh project').click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(root.querySelector('.portal-sections').dataset.section, 'billing', 'refresh preserves current section');
  assert.equal(JSON.stringify(fixture), before, 'rendering does not alter the stored payment projection');
  const canonical = {portal:{status:'active'},client:{name:'Sample Client',brandBusiness:'Northstar Studio'},project:{title:'Northstar website',status:'In Production'},documents:[{type:'agreement',label:'Agreement',ready:true},{type:'proposal',label:'Proposal',ready:true,status:'needs-info'},{type:'Service Summary',ready:true,status:'ready'},{type:'Paid Receipt',label:'Receipt',ready:false,status:'locked'}],payment:{},contact:{email:'contact@onlytrueperspective.tech'}};
  dom.window.canonicalFixture = canonical;
  vm.runInContext('renderPortal(canonicalFixture)', dom.getInternalVMContext());
  assert.equal(root.querySelectorAll('[role="tab"]').length, 5);
  assert.equal(root.querySelectorAll('[role="tabpanel"]:not([hidden])').length, 1);
  assert.match(root.textContent, /Under review/);
  assert.doesNotMatch(root.textContent, /Oracle \+|IEI Active|\$0\.00/);
  const receipt = [...root.querySelectorAll('.portal-v2-document')].find(item => item.textContent.includes('Receipt'));
  assert.equal(receipt.querySelector('a'), null, 'unready canonical document has no link');
  const agreement = [...root.querySelectorAll('.portal-v2-document')].find(item => item.textContent.includes('Agreement'));
  assert.ok([...agreement.querySelectorAll('a')].some(link => link.textContent.includes('View document')), 'canonical portal documents expose the formatted document preview');
  assert.match([...agreement.querySelectorAll('a')].find(link => link.textContent.includes('View document')).href, /\/documents\/agreement\/view$/);
  assert.ok([...agreement.querySelectorAll('a')].some(link => link.textContent.includes('Download PDF')));
  const blockedProposal = [...root.querySelectorAll('.portal-v2-document')].find(item => item.textContent.includes('Proposal'));
  assert.equal(blockedProposal.querySelector('a'), null, 'canonical renderer keeps documents with a blocked state unavailable');
  const serviceSummary = [...root.querySelectorAll('.portal-v2-document')].find(item => item.textContent.includes('Service Summary'));
  assert.match([...serviceSummary.querySelectorAll('a')].find(link => link.textContent.includes('View document')).href, /\/documents\/service-summary\/view$/);
  const paidReceipt = [...root.querySelectorAll('.portal-v2-document')].find(item => item.textContent.includes('Receipt'));
  assert.equal(paidReceipt.querySelector('a'), null, 'paid receipt stays locked until payment is recorded');
  root.querySelector('#portal-tab-support').click();
  const helpInput = root.querySelector('#portal-project-help');
  helpInput.value = 'payment';
  [...root.querySelectorAll('button')].find(button => button.textContent === 'Find answer').click();
  assert.equal(root.querySelector('.portal-v2-assistant-response').hidden, false);
  assert.match(root.querySelector('.portal-v2-assistant-response').textContent, /Payment state/);
  assert.ok(requests.every(request => request.method === 'GET'), 'rendering and navigating never write client records');
  dom.window.close();
  console.log('CLIENT PORTAL RENDER COMPLETE');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
