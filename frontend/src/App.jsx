import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, deleteDoc } from 'firebase/firestore';

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

const App = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (!auth || !db) {
      console.error("Firebase services are not initialized.");
      setLoading(false);
      return;
    }

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser);
          await setDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid), {
            email: currentUser.email,
            lastLogin: serverTimestamp()
          }, { merge: true });
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error("Error setting user doc:", e);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  // Use a separate effect for data listeners
  useEffect(() => {
    if (!db || !user) {
      return;
    }

    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'invoices'), orderBy('createdAt', 'desc'));
    const unsubDocs = onSnapshot(q, (snapshot) => {
      const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(invoices);
    });

    return () => unsubDocs();
  }, [db, user]);

  useEffect(() => {
    const signIn = async () => {
      if (!initialAuthToken) {
        console.log("No custom auth token provided, signing in anonymously.");
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous sign-in failed:", error);
        }
        return;
      }

      try {
        await signInWithCustomToken(auth, initialAuthToken);
      } catch (error) {
        console.error("Custom token sign-in failed:", error);
      }
    };

    if (auth) {
      signIn();
    }
  }, [auth]);

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setError('');
    setProcessing(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSelectedInvoice(null);
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setProcessing(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('http://localhost:5000/upload-invoice', {
        method: 'POST',
        body: formData,
      });
      
      console.log(response)

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload invoice.');
      }

      const result = await response.json();
      console.log('Invoice uploaded successfully:', result);
      setFile(null); // Clear the file input
    } catch (e) {
      setError(e.message);
      console.error("Error uploading invoice:", e);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'invoices', taskId));
    } catch (e) {
      console.error("Error deleting task:", e);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="text-center text-lg font-medium text-gray-600">Loading...</div>
        </div>
      );
    }

    if (!user) {
      return (
        <div className={loginStyles.container}>
          <div className={loginStyles.card}>
            <h1 className={loginStyles.title}>
              {isLogin ? 'Welcome Back!' : 'Create an Account'}
            </h1>
            <form onSubmit={handleAuthAction}>
              <div className={loginStyles.formGroup}>
                <label className={loginStyles.label}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={loginStyles.input}
                  required
                />
              </div>
              <div className={loginStyles.formGroup}>
                <label className={loginStyles.label}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={loginStyles.input}
                  required
                />
              </div>
              {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
              <button
                type="submit"
                className={loginStyles.button}
                disabled={processing}
              >
                {processing ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
              </button>
            </form>
            <p className={loginStyles.toggleText}>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <span className={loginStyles.toggleLink} onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? ' Sign Up' : ' Login'}
              </span>
            </p>
          </div>
        </div>
      );
    }

    if (selectedInvoice) {
      return <InvoiceProcessingView onBack={() => setSelectedInvoice(null)} invoice={selectedInvoice} />;
    }

    return (
      <div className={dashboardStyles.container}>
        <div className={dashboardStyles.header}>
          <h1 className={dashboardStyles.title}>AI Tally Agent Dashboard</h1>
          <button onClick={handleLogout} className={dashboardStyles.logoutBtn}>
            Logout
          </button>
        </div>
        <div className={dashboardStyles.mainContent}>
          <div className="lg:col-span-2 flex flex-col">
            <div className={dashboardStyles.card}>
              <h2 className={dashboardStyles.cardTitle}>Upload Invoice</h2>
              <form onSubmit={handleFileUpload} className={dashboardStyles.fileUploadSection}>
                <div className={dashboardStyles.dropzone}>
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`${dashboardStyles.uploadIcon} mx-auto`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <p className={dashboardStyles.uploadText}>
                      {file ? file.name : "Drag & Drop a file or click to upload"}
                    </p>
                    <input type="file" onChange={handleFileChange} className="hidden" id="file-upload" />
                    <label htmlFor="file-upload" className="mt-8 px-6 py-3 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition-colors cursor-pointer">
                      Choose File
                    </label>
                    <button type="submit" className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition-colors" disabled={processing || !file}>
                      {processing ? 'Processing...' : 'Upload File'}
                    </button>
                    {error && <div className="text-red-500 text-sm mt-4">{error}</div>}
                  </div>
                </div>
              </form>
            </div>
            <div className={`${dashboardStyles.card} mt-6`}>
              <h2 className={dashboardStyles.cardTitle}>Recent Processed Invoices</h2>
              <div className={dashboardStyles.listContainer}>
                {tasks.length === 0 ? (
                  <p className="text-gray-500 text-center mt-8">No invoices processed yet.</p>
                ) : (
                  tasks.map(task => (
                    <div key={task.id} className={dashboardStyles.listItem}>
                      <span className="font-semibold text-sm">{task.fileName}</span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${task.status === 'Pending' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>{task.status}</span>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => setSelectedInvoice(task)} className="text-indigo-600 hover:text-indigo-800">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDeleteTask(task.id)} className="text-red-500 hover:text-red-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <div className={dashboardStyles.card}>
              <h2 className={dashboardStyles.cardTitle}>User Information</h2>
              <p className="text-sm text-gray-600">User ID:</p>
              <pre className={dashboardStyles.userIdDisplay}>
                {user.uid}
              </pre>
              <p className="text-sm text-gray-600 mt-2">
                This is your unique user ID. In a multi-user app, you would share this to find other users.
              </p>
            </div>
            <div className={`${dashboardStyles.card} mt-6`}>
              <h2 className={dashboardStyles.cardTitle}>Tally Integration</h2>
              <p className="text-gray-600 text-sm">This is where the agent would connect to Tally.</p>
              <div className="mt-4 p-4 border rounded-lg bg-gray-100">
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-700">Status:</span> Disconnected
                </p>
                <button className="mt-2 px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 transition-colors">
                  Connect to Tally
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body {
          font-family: 'Inter', sans-serif;
        }
      `}</style>
      {renderContent()}
      abc
    </div>
  );
};

export default App;
