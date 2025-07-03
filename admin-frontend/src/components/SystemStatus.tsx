import React, { useEffect, useState } from 'react';
import { fetchSystemStatus } from '../api/ApiCollection';

interface SystemStatusData {
    services: {
        database: { status: string; connection: string };
        cloudflare: { status: string; accountId: string; accountHash: string };
        payment: { payos: { status: string; clientId: string; returnUrl: string; cancelUrl: string } };
        sms: { esms: { status: string; secretKey: string } };
        jwt: { secret: string; refreshSecret: string; expiresIn: string; refreshExpiresIn: string };
    };
    database: {
        name: string;
        collections: number;
        dataSize: string;
        storageSize: string;
        indexes: number;
    };
    environment: string;
    uptime: number;
    memory: any;
    timestamp: string;
}

const SystemStatus: React.FC = () => {
    const [systemData, setSystemData] = useState<SystemStatusData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadSystemStatus = async () => {
            try {
                setLoading(true);
                const response = await fetchSystemStatus();
                setSystemData(response.data);
            } catch (err: any) {
                setError(err.message || 'Failed to load system status');
            } finally {
                setLoading(false);
            }
        };

        loadSystemStatus();
        
        // Refresh every 30 seconds
        const interval = setInterval(loadSystemStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <h2 className="card-title">System Status</h2>
                    <div className="flex justify-center">
                        <span className="loading loading-spinner loading-lg"></span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <h2 className="card-title text-error">System Status</h2>
                    <p className="text-error">{error}</p>
                </div>
            </div>
        );
    }

    if (!systemData) return null;

    const getStatusBadge = (status: string) => {
        if (status === 'configured' || status === 'connected' || status === 'set') {
            return <div className="badge badge-success">{status}</div>;
        }
        return <div className="badge badge-error">{status}</div>;
    };

    const formatUptime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const formatMemory = (bytes: number) => {
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <div className="flex justify-between items-center">
                    <h2 className="card-title">System Status</h2>
                    <div className="badge badge-primary">{systemData.environment}</div>
                </div>

                {/* Database Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    <div className="stat">
                        <div className="stat-title">Database</div>
                        <div className="stat-value text-lg">{systemData.database.name}</div>
                        <div className="stat-desc">
                            Collections: {systemData.database.collections} | 
                            Size: {systemData.database.dataSize}
                        </div>
                    </div>

                    <div className="stat">
                        <div className="stat-title">Uptime</div>
                        <div className="stat-value text-lg">{formatUptime(systemData.uptime)}</div>
                        <div className="stat-desc">
                            Memory: {formatMemory(systemData.memory.rss)}
                        </div>
                    </div>

                    <div className="stat">
                        <div className="stat-title">Last Updated</div>
                        <div className="stat-value text-sm">
                            {new Date(systemData.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="stat-desc">Auto-refresh: 30s</div>
                    </div>
                </div>

                {/* Services Status */}
                <div className="divider">Services Health</div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Database */}
                    <div className="card bg-base-200">
                        <div className="card-body p-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                🗄️ Database
                                {getStatusBadge(systemData.services.database.status)}
                            </h3>
                            <p className="text-sm">Connection: {getStatusBadge(systemData.services.database.connection)}</p>
                        </div>
                    </div>

                    {/* Cloudflare */}
                    <div className="card bg-base-200">
                        <div className="card-body p-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                ☁️ Cloudflare
                                {getStatusBadge(systemData.services.cloudflare.status)}
                            </h3>
                            <p className="text-sm">
                                Account: {getStatusBadge(systemData.services.cloudflare.accountId)}
                            </p>
                        </div>
                    </div>

                    {/* Payment */}
                    <div className="card bg-base-200">
                        <div className="card-body p-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                💳 PayOS
                                {getStatusBadge(systemData.services.payment.payos.status)}
                            </h3>
                            <p className="text-sm">
                                Client: {getStatusBadge(systemData.services.payment.payos.clientId)}
                            </p>
                        </div>
                    </div>

                    {/* SMS */}
                    <div className="card bg-base-200">
                        <div className="card-body p-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                📱 ESMS
                                {getStatusBadge(systemData.services.sms.esms.status)}
                            </h3>
                            <p className="text-sm">
                                Secret: {getStatusBadge(systemData.services.sms.esms.secretKey)}
                            </p>
                        </div>
                    </div>

                    {/* JWT */}
                    <div className="card bg-base-200">
                        <div className="card-body p-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                🔐 JWT Auth
                                {getStatusBadge(systemData.services.jwt.secret)}
                            </h3>
                            <p className="text-sm">
                                Expires: {systemData.services.jwt.expiresIn}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemStatus; 