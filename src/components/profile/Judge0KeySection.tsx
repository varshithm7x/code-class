import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { 
  Shield, 
  Key, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  ExternalLink,
  Info
} from 'lucide-react';

interface Judge0Status {
  hasKey: boolean;
  keyStatus: string;
  quotaUsed: number;
  lastReset: string | null;
  isSharedWithClass: boolean;
  sharedKeyInfo: {
    status: string;
    dailyUsage: number;
    dailyLimit: number;
    lastUsed: string | null;
  } | null;
}

interface Judge0KeySectionProps {
  onKeyUpdate?: () => void;
}

const Judge0KeySection: React.FC<Judge0KeySectionProps> = ({ onKeyUpdate }) => {
  const [status, setStatus] = useState<Judge0Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    apiKey: '',
    agreedToSharing: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch current Judge0 status
  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/auth/judge0-status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        setError('Failed to fetch Judge0 key status');
      }
    } catch (err) {
      setError('Error fetching Judge0 key status');
    } finally {
      setLoading(false);
    }
  };

  // Add or update Judge0 API key
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/auth/judge0-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setShowForm(false);
        setFormData({ apiKey: '', agreedToSharing: false });
        await fetchStatus(); // Refresh status
        onKeyUpdate?.();
      } else {
        setError(data.message || 'Failed to add Judge0 API key');
      }
    } catch (err) {
      setError('Error adding Judge0 API key');
    } finally {
      setSubmitting(false);
    }
  };

  // Remove Judge0 API key
  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove your Judge0 API key? This will affect your ability to run code in tests.')) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/auth/judge0-key', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        await fetchStatus(); // Refresh status
        onKeyUpdate?.();
      } else {
        setError(data.message || 'Failed to remove Judge0 API key');
      }
    } catch (err) {
      setError('Error removing Judge0 API key');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getStatusIcon = (keyStatus: string) => {
    switch (keyStatus) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'EXHAUSTED':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'INVALID':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (keyStatus: string) => {
    switch (keyStatus) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'EXHAUSTED':
        return <Badge variant="warning">Quota Exhausted</Badge>;
      case 'INVALID':
        return <Badge variant="destructive">Invalid</Badge>;
      default:
        return <Badge variant="secondary">Not Provided</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Judge0 API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading Judge0 status...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Judge0 API Configuration
        </CardTitle>
        <p className="text-sm text-gray-600">
          Provide your Judge0 API key to enable code execution in coding tests
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alert Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Current Status */}
        {status && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Key Status:</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.keyStatus)}
                  {getStatusBadge(status.keyStatus)}
                </div>
              </div>

              {status.hasKey && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Daily Quota Used:</span>
                    <span className="text-sm font-mono">
                      {status.quotaUsed}/50 requests
                    </span>
                  </div>

                  {status.lastReset && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Last Reset:</span>
                      <span className="text-sm">
                        {new Date(status.lastReset).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Class Sharing:</span>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <Badge variant={status.isSharedWithClass ? "default" : "secondary"}>
                    {status.isSharedWithClass ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>

              {status.sharedKeyInfo && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pool Usage:</span>
                    <span className="text-sm font-mono">
                      {status.sharedKeyInfo.dailyUsage}/{status.sharedKeyInfo.dailyLimit}
                    </span>
                  </div>

                  {status.sharedKeyInfo.lastUsed && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Last Used:</span>
                      <span className="text-sm">
                        {new Date(status.sharedKeyInfo.lastUsed).toLocaleString()}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Information Box */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Why do I need a Judge0 API key?</strong>
            <br />
            Judge0 enables code execution during tests. Your key helps distribute API costs across the class.
            <a 
              href="https://rapidapi.com/judge0-official/api/judge0-ce" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 ml-2 text-blue-600 hover:text-blue-800"
            >
              Get API Key <ExternalLink className="h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!status?.hasKey ? (
            <Button 
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2"
            >
              <Key className="h-4 w-4" />
              Add API Key
            </Button>
          ) : (
            <>
              <Button 
                variant="outline"
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2"
              >
                <Key className="h-4 w-4" />
                Update Key
              </Button>
              <Button 
                variant="destructive"
                onClick={handleRemove}
                disabled={submitting}
                className="flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Remove Key
              </Button>
            </>
          )}
        </div>

        {/* API Key Form */}
        {showForm && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="apiKey">Judge0 API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your RapidAPI Judge0 key"
                  value={formData.apiKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                  required
                  minLength={10}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Get your API key from RapidAPI Judge0 CE (free tier: 50 requests/day)
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="sharing"
                  checked={formData.agreedToSharing}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, agreedToSharing: checked }))
                  }
                />
                <Label htmlFor="sharing" className="text-sm">
                  Share with class pool (recommended for better quota distribution)
                </Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Validating...' : 'Save API Key'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Instructions */}
        {(!status?.hasKey || showForm) && (
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>How to get a Judge0 API key:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Visit <a href="https://rapidapi.com/judge0-official/api/judge0-ce" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">RapidAPI Judge0 CE</a></li>
              <li>Sign up or log in to RapidAPI</li>
              <li>Subscribe to the free tier (50 requests/day)</li>
              <li>Copy your API key from the dashboard</li>
              <li>Paste it above and optionally share with the class pool</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Judge0KeySection; 