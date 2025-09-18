// lib/clientAuth.js
export function saveCustomerSession(payload) {
    // expected payload: { token, orgId, orgName, name, email }
    localStorage.setItem('customerSession', JSON.stringify(payload));
  }
  
  export function getCustomerSession() {
    try {
      const raw = localStorage.getItem('customerSession');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  
  export function clearCustomerSession() {
    localStorage.removeItem('customerSession');
  }
  