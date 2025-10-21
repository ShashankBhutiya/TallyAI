import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, deleteDoc } from 'firebase/firestore';
import SubscriptionPage from './SubscriptionPage';


// Config from Vite env or injected globals
const envFirebaseConfig = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_CONFIG)
  ? JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG)
  : null;
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : (envFirebaseConfig || {});
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : (import.meta?.env?.VITE_INITIAL_AUTH_TOKEN ?? null);
const appId = typeof __app_id !== 'undefined' ? __app_id : (import.meta?.env?.VITE_APP_ID ?? 'default-app-id');

// Initialize Firebase with a check
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

const loginStyles = {
  container: 'min-h-screen flex items-center justify-center bg-gray-100 p-4',
  card: 'w-full max-w-md bg-white rounded-xl shadow-2xl p-8 transform transition-all duration-300 hover:scale-105',
  title: 'text-3xl font-bold text-center text-gray-800 mb-6',
  formGroup: 'mb-4',
  label: 'block text-sm font-medium text-gray-700 mb-1',
  input: 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors',
  button: 'w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-transform transform hover:scale-105',
  toggleText: 'text-sm text-center text-gray-600 mt-4',
  toggleLink: 'text-indigo-600 font-semibold hover:underline cursor-pointer'
};

const dashboardStyles = {
  container: 'min-h-screen bg-gray-50 flex flex-col',
  header: 'bg-indigo-700 text-white p-4 shadow-lg flex justify-between items-center',
  title: 'text-2xl font-bold',
  logoutBtn: 'bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors',
  mainContent: 'flex-1 p-6 grid lg:grid-cols-3 gap-6',
  card: 'bg-white rounded-xl shadow-lg p-6 flex flex-col',
  cardTitle: 'text-xl font-semibold text-gray-800 mb-4',
  listContainer: 'flex-1 overflow-auto',
  listItem: 'p-3 mb-2 bg-gray-100 rounded-md flex justify-between items-center hover:bg-gray-200 transition-colors cursor-pointer',
  userIdDisplay: 'bg-gray-200 text-gray-800 text-xs p-2 rounded-md font-mono mt-4 overflow-x-auto',
  fileUploadSection: 'mt-4 flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors space-y-6',
  uploadIcon: 'text-indigo-500 text-4xl mb-2',
  uploadText: 'text-gray-600 font-medium',
  dropzone: 'w-full h-full flex items-center justify-center',
};

const InvoiceProcessingView = ({ onBack, invoice }) => {
  const [data, setData] = useState(invoice.data);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleEditChange = (key, value) => {
    setData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const invoiceRef = doc(db, 'artifacts', appId, 'public', 'data', 'invoices', invoice.id);
      await setDoc(invoiceRef, {
        ...invoice,
        data,
        status: 'Processed'
      });
      setIsEditing(false);
      // Optional: Show a success message
    } catch (error) {
      console.error("Error saving invoice data:", error);
      // Optional: Show an error message
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onBack} className="text-indigo-600 hover:underline flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Invoice: {invoice.data.invoiceNumber || invoice.id}</h2>
      </div>
      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <h3 className="text-lg font-semibold mb-2">Original Invoice</h3>
        <p className="text-gray-600">This would show a preview of the original invoice document.</p>
        <div className="bg-white border-2 border-dashed border-gray-300 w-full h-48 flex items-center justify-center text-gray-400">
          <span className="text-sm">Invoice Preview Here</span>
        </div>
      </div>
      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Extracted Data</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(data).map(([key, value]) => (
              <tr key={key}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{key}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {isEditing ? (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleEditChange(key, e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  ) : (
                    value
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              className={`py-2 px-4 rounded-lg font-semibold transition-colors ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'}`}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="py-2 px-4 rounded-lg font-semibold text-gray-700 border border-gray-300 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="py-2 px-4 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    // Check backend health
    fetch('https://tallyai-production-ed6c.up.railway.app/api/health')
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Network response was not ok.');
      })
      .then(data => {
        console.log('Backend health check successful:', data);
        setBackendStatus('ok');
      })
      .catch(error => {
        console.error('Backend health check failed:', error);
        setBackendStatus('error');
      });
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    // This is a mock login. Replace with your actual Firebase auth logic.
    if (email && password) {
      const mockUser = { uid: '12345', email: email };
      setUser(mockUser);
    } else {
      alert('Please enter email and password');
    }
  };

  useEffect(() => {
    if (!user) return;

    const checkSubscription = async () => {
      try {
        const response = await fetch('http://localhost:5000/check-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.uid, // Use the actual user ID from the user object
          }),
        });
        const data = await response.json();
        if (data.subscription_status === 'active') {
          setIsSubscribed(true);
        } else {
          setIsSubscribed(false);
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
        // Handle error appropriately
      }
    };
    checkSubscription();
  }, [user]);

  if (!user) {
    return (
      <div className="login-container">
        <form onSubmit={handleLogin}>
          <h2>Login</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="App">
      <p>Backend status: {backendStatus}</p>
      {isSubscribed ? (
        <div>
          <h1>Welcome to the AI Tally Agent!</h1>
          {/* Add your main application components here */}
        </div>
      ) : (
        <SubscriptionPage userId={user.uid} />
      )}
    </div>
  );
}

export default App;