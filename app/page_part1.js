'use client';

import { useState, useEffect } from 'react';
import { Shield, Copy, Check, Eye, EyeOff, Plus, Search, Trash2, Edit, Moon, Sun, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/sonner';
import { generatePassword, calculatePasswordStrength } from '@/lib/passwordGenerator';
import { encryptData, decryptData } from '@/lib/crypto';

export default function App() {
  const { toast } = useToast();
  const [darkMode, setDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [token, setToken] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [passwordLength, setPasswordLength] = useState(16);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [excludeLookalikes, setExcludeLookalikes] = useState(true);
  const [copied, setCopied] = useState(false);
  const [vaultItems, setVaultItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showPasswordId, setShowPasswordId] = useState(null);
  const [formData, setFormData] = useState({ title: '', username: '', password: '', url: '', notes: '' });

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedMasterPassword = localStorage.getItem('masterPassword');
    if (storedToken && storedMasterPassword) {
      setToken(storedToken);
      setMasterPassword(storedMasterPassword);
      setIsLoggedIn(true);
      fetchVaultItems(storedToken);
    }
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => { handleGeneratePassword(); }, []);

  const handleGeneratePassword = () => {
    try {
      const pwd = generatePassword({ length: passwordLength, includeLowercase, includeUppercase, includeNumbers, includeSymbols, excludeLookalikes });
      setGeneratedPassword(pwd);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleCopyPassword = async (password) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast({ title: 'Copied!', description: 'Password copied to clipboard. Auto-clear in 15 seconds.' });
      setTimeout(async () => { await navigator.clipboard.writeText(''); setCopied(false); }, 15000);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to copy password', variant: 'destructive' });
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed');
      setToken(data.token);
      setMasterPassword(password);
      setIsLoggedIn(true);
      localStorage.setItem('token', data.token);
      localStorage.setItem('masterPassword', password);
      toast({ title: 'Success!', description: authMode === 'login' ? 'Logged in successfully' : 'Account created' });
      fetchVaultItems(data.token);
      setPassword('');
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const fetchVaultItems = async (authToken, search = '') => {
    try {
      const url = search ? \`/api/vault?search=\${encodeURIComponent(search)}\` : '/api/vault';
      const response = await fetch(url, { headers: { 'Authorization': \`Bearer \${authToken}\` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch vault items');
      setVaultItems(data.items);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleSaveVaultItem = async (e) => {
    e.preventDefault();
    try {
      const encryptedData = encryptData(formData, masterPassword);
      const payload = { title: formData.title, username: formData.username, url: formData.url, encryptedData };
      if (editingItem) {
        const response = await fetch(\`/api/vault/\${editingItem.itemId}\`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error('Failed to update item');
      } else {
        const response = await fetch('/api/vault', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error('Failed to create item');
      }
      toast({ title: 'Success!', description: editingItem ? 'Item updated' : 'Item saved to vault' });
      setShowAddDialog(false);
      setEditingItem(null);
      setFormData({ title: '', username: '', password: '', url: '', notes: '' });
      fetchVaultItems(token, searchQuery);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEditItem = (item) => {
    try {
      const decryptedData = decryptData(item.encryptedData, masterPassword);
      setFormData(decryptedData);
      setEditingItem(item);
      setShowAddDialog(true);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to decrypt item', variant: 'destructive' });
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Delete this item?')) return;
    try {
      const response = await fetch(\`/api/vault/\${itemId}\`, { method: 'DELETE', headers: { 'Authorization': \`Bearer \${token}\` } });
      if (!response.ok) throw new Error('Failed to delete item');
      toast({ title: 'Success!', description: 'Item deleted' });
      fetchVaultItems(token, searchQuery);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken('');
    setMasterPassword('');
    setVaultItems([]);
    localStorage.removeItem('token');
    localStorage.removeItem('masterPassword');
    toast({ title: 'Logged out', description: 'Successfully logged out' });
  };

  const handleSearch = (query) => { setSearchQuery(query); if (token) fetchVaultItems(token, query); };
  const handleUseGeneratedPassword = () => { setFormData({ ...formData, password: generatedPassword }); toast({ title: 'Password added', description: 'Generated password added to form' }); };
  const getDecryptedPassword = (item) => { try { const decryptedData = decryptData(item.encryptedData, masterPassword); return decryptedData.password; } catch (error) { return '***'; } };
  const passwordStrength = calculatePasswordStrength(generatedPassword);
