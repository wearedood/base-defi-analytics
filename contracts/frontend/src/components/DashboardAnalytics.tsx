import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Badge,
  Button,
  Progress,
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Activity,
  PieChart as PieChartIcon,
  BarChart3,
  LineChart as LineChartIcon,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Target,
  Shield
} from 'lucide-react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useBaseAnalytics } from '@/hooks/useBaseAnalytics';
import { formatCurrency, formatPercentage, formatNumber } from '@/utils/formatters';
import { calculateAPY, calculateRisk, calculateOptimalAllocation } from '@/utils/defi';

// Types
interface ProtocolData {
  id: string;
  name: string;
  tvl: number;
  apy: number;
  riskScore: number;
  volume24h: number;
  change24h: number;
  isActive: boolean;
  category: 'DEX' | 'Lending' | 'Yield' | 'Derivatives';
}

interface UserPosition {
  strategyId: string;
  strategyName: string;
  amount: number;
  currentValue: number;
  pnl: number;
  pnlPercentage: number;
  apy: number;
  riskLevel: number;
  entryDate: Date;
  lastRewardClaim: Date;
  pendingRewards: number;
}

interface ArbitrageOpportunity {
  id: string;
  tokenA: string;
  tokenB: string;
  dexA: string;
  dexB: string;
  profitPotential: number;
  profitPercentage: number;
  timestamp: Date;
  isExecuted: boolean;
  estimatedGas: number;
}

interface DashboardMetrics {
  totalTVL: number;
  totalUsers: number;
  totalVolume24h: number;
  totalRewardsDistributed: number;
  averageAPY: number;
  activeStrategies: number;
  arbitrageOpportunities: number;
  riskScore: number;
}

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  success: '#22C55E',
  info: '#06B6D4',
  purple: '#8B5CF6',
  pink: '#EC4899'
};

const RISK_COLORS = {
  1: '#22C55E', // Low risk - Green
  2: '#22C55E',
  3: '#84CC16', // Medium-low - Lime
  4: '#84CC16',
  5: '#F59E0B', // Medium - Amber
  6: '#F59E0B',
  7: '#F97316', // Medium-high - Orange
  8: '#F97316',
  9: '#EF4444', // High risk - Red
  10: '#EF4444'
};

const DashboardAnalytics: React.FC = () => {
  const { account, isConnected } = useWeb3();
  const {
    protocols,
    userPositions,
    arbitrageOpportunities,
    dashboardMetrics,
    isLoading,
    error,
    refreshData
  } = useBaseAnalytics();

  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'DEX' | 'Lending' | 'Yield'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshData();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshData]);

  // Filter protocols by category
  const filteredProtocols = useMemo(() => {
    if (selectedCategory === 'all') return protocols;
    return protocols.filter(protocol => protocol.category === selectedCategory);
  }, [protocols, selectedCategory]);

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    if (!userPositions.length) return null;

    const totalValue = userPositions.reduce((sum, pos) => sum + pos.currentValue, 0);
    const totalPnL = userPositions.reduce((sum, pos) => sum + pos.pnl, 0);
    const totalPendingRewards = userPositions.reduce((sum, pos) => sum + pos.pendingRewards, 0);
    const weightedAPY = userPositions.reduce((sum, pos) => {
      return sum + (pos.apy * pos.currentValue / totalValue);
    }, 0);
    const averageRisk = userPositions.reduce((sum, pos) => sum + pos.riskLevel, 0) / userPositions.length;

    return {
      totalValue,
      totalPnL,
      totalPnLPercentage: totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0,
      totalPendingRewards,
      weightedAPY,
      averageRisk,
      positionCount: userPositions.length
    };
  }, [userPositions]);

  // Prepare chart data
  const protocolChartData = useMemo(() => {
    return filteredProtocols.map(protocol => ({
      name: protocol.name,
      tvl: protocol.tvl,
      apy: protocol.apy,
      volume: protocol.volume24h,
      risk: protocol.riskScore,
      change: protocol.change24h
    }));
  }, [filteredProtocols]);

  const riskDistributionData = useMemo(() => {
    const distribution = protocols.reduce((acc, protocol) => {
      const riskCategory = protocol.riskScore <= 3 ? 'Low' :
                          protocol.riskScore <= 6 ? 'Medium' : 'High';
      acc[riskCategory] = (acc[riskCategory] || 0) + protocol.tvl;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([risk, value]) => ({
      name: risk,
      value,
      color: risk === 'Low' ? COLORS.success :
             risk === 'Medium' ? COLORS.warning : COLORS.danger
    }));
  }, [protocols]);

  const topArbitrageOpportunities = useMemo(() => {
    return arbitrageOpportunities
      .filter(opp => !opp.isExecuted)
      .sort((a, b) => b.profitPotential - a.profitPotential)
      .slice(0, 5);
  }, [arbitrageOpportunities]);

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Connect Wallet
            </CardTitle>
            <CardDescription>
              Connect your wallet to access Base DeFi Analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => window.ethereum?.request({ method: 'eth_requestAccounts' })}>
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Data</AlertTitle>
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={refreshData}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Base DeFi Analytics</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive analytics for Base blockchain DeFi protocols
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Zap className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            Auto Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={refreshData}>
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total TVL</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardMetrics.totalTVL)}</div>
            <p className="text-xs text-muted-foreground">
              Across {dashboardMetrics.activeStrategies} active strategies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dashboardMetrics.totalUsers)}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardMetrics.totalVolume24h)}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardMetrics.arbitrageOpportunities} arbitrage opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average APY</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(dashboardMetrics.averageAPY)}</div>
            <p className="text-xs text-muted-foreground">
              Risk Score: {dashboardMetrics.riskScore}/10
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Overview */}
      {portfolioMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Your Portfolio
            </CardTitle>
            <CardDescription>
              Overview of your DeFi positions and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(portfolioMetrics.totalValue)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">P&L</p>
                <p className={`text-xl font-bold ${portfolioMetrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(portfolioMetrics.totalPnL)}
                  <span className="text-sm ml-1">
                    ({formatPercentage(portfolioMetrics.totalPnLPercentage)})
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Rewards</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(portfolioMetrics.totalPendingRewards)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Weighted APY</p>
                <p className="text-xl font-bold">{formatPercentage(portfolioMetrics.weightedAPY)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Risk Level</p>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: RISK_COLORS[Math.round(portfolioMetrics.averageRisk)] }}></div>
                  <p className="text-xl font-bold">{portfolioMetrics.averageRisk.toFixed(1)}/10</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Positions</p>
                <p className="text-xl font-bold">{portfolioMetrics.positionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="protocols" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="protocols">Protocols</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="arbitrage">Arbitrage</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Protocols Tab */}
        <TabsContent value="protocols" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {['all', 'DEX', 'Lending', 'Yield'].map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category as any)}
                >
                  {category === 'all' ? 'All Protocols' : category}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TVL Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Protocol TVL Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={protocolChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="tvl" fill={COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* APY vs Risk Chart */}
            <Card>
              <CardHeader>
                <CardTitle>APY vs Risk Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={protocolChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="apy" stroke={COLORS.success} name="APY (%)" />
                    <Line yAxisId="right" type="monotone" dataKey="risk" stroke={COLORS.danger} name="Risk Score" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Protocol List */}
          <Card>
            <CardHeader>
              <CardTitle>Protocol Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredProtocols.map((protocol) => (
                  <div key={protocol.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-semibold">{protocol.name}</h3>
                        <Badge variant="secondary">{protocol.category}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <p className="text-gray-600">TVL</p>
                        <p className="font-semibold">{formatCurrency(protocol.tvl)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">APY</p>
                        <p className="font-semibold text-green-600">{formatPercentage(protocol.apy)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Risk</p>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: RISK_COLORS[protocol.riskScore] }}></div>
                          <p className="font-semibold">{protocol.riskScore}/10</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600">24h Change</p>
                        <p className={`font-semibold ${protocol.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {protocol.change24h >= 0 ? '+' : ''}{formatPercentage(protocol.change24h)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Arbitrage Tab */}
        <TabsContent value="arbitrage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Top Arbitrage Opportunities
              </CardTitle>
              <CardDescription>
                Real-time arbitrage opportunities across Base DEXs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topArbitrageOpportunities.map((opportunity) => (
                  <div key={opportunity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">
                        {opportunity.tokenA}/{opportunity.tokenB}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {opportunity.dexA} import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge, Button, Progress, Alert, AlertDescription, AlertTitle } from '@/components/ui';
import { TrendingUp, TrendingDown, DollarSign, Users, Activity, PieChart as PieChartIcon, BarChart3, LineChart as LineChartIcon, AlertTriangle, CheckCircle, Clock, Zap, Target, Shield } from 'lucide-react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useBaseAnalytics } from '@/hooks/useBaseAnalytics';
import { formatCurrency, formatPercentage, formatNumber } from '@/utils/formatters';
import { calculateAPY, calculateRisk, calculateOptimalAllocation } from '@/utils/defi';

/**
 * @title DashboardAnalytics
 * @description Comprehensive analytics dashboard for Base DeFi protocols
 * @author Base DeFi Analytics Team
 */

// Types and Interfaces
interface ProtocolData {
  id: string;
  name: string;
  tvl: number;
  apy: number;
  riskScore: number;
  volume24h: number;
  change24h: number;
  isActive: boolean;
  category: 'DEX' | 'Lending' | 'Yield' | 'Derivatives';
}

interface UserPosition {
  strategyId: string;
  strategyName: string;
  amount: number;
  currentValue: number;
  pnl: number;
  pnlPercentage: number;
  apy: number;
  riskLevel: number;
  entryDate: Date;
  lastRewardClaim: Date;
  pendingRewards: number;
}

interface ArbitrageOpportunity {
  id: string;
  tokenA: string;
  tokenB: string;
  dexA: string;
  dexB: string;
  profitPotential: number;
  profitPercentage: number;
  timestamp: Date;
  isExecuted: boolean;
  estimatedGas: number;
}

interface DashboardMetrics {
  totalTVL: number;
  totalUsers: number;
  totalVolume24h: number;
  totalRewardsDistributed: number;
  averageAPY: number;
  activeStrategies: number;
  arbitrageOpportunities: number;
  riskScore: number;
}

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  success: '#22C55E',
  info: '#06B6D4',
  purple: '#8B5CF6',
  pink: '#EC4899'
};

const RISK_COLORS = {
  1: '#22C55E', 2: '#22C55E', 3: '#84CC16', 4: '#84CC16',
  5: '#F59E0B', 6: '#F59E0B', 7: '#F97316', 8: '#F97316',
  9: '#EF4444', 10: '#EF4444'
};

const DashboardAnalytics: React.FC = () => {
  const { account, isConnected } = useWeb3();
  const { protocols, userPositions, arbitrageOpportunities, dashboardMetrics, isLoading, error, refreshData } = useBaseAnalytics();

  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'DEX' | 'Lending' | 'Yield'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => { refreshData(); }, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshData]);

  // Filter protocols by category
  const filteredProtocols = useMemo(() => {
    if (selectedCategory === 'all') return protocols;
    return protocols.filter(protocol => protocol.category === selectedCategory);
  }, [protocols, selectedCategory]);

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    if (!userPositions.length) return null;
    const totalValue = userPositions.reduce((sum, pos) => sum + pos.currentValue, 0);
    const totalPnL = userPositions.reduce((sum, pos) => sum + pos.pnl, 0);
    const totalPendingRewards = userPositions.reduce((sum, pos) => sum + pos.pendingRewards, 0);
    const weightedAPY = userPositions.reduce((sum, pos) => sum + (pos.apy * pos.currentValue / totalValue), 0);
    const averageRisk = userPositions.reduce((sum, pos) => sum + pos.riskLevel, 0) / userPositions.length;

    return {
      totalValue, totalPnL,
      totalPnLPercentage: totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0,
      totalPendingRewards, weightedAPY, averageRisk,
      positionCount: userPositions.length
    };
  }, [userPositions]);

  // Prepare chart data
  const protocolChartData = useMemo(() => {
    return filteredProtocols.map(protocol => ({
      name: protocol.name, tvl: protocol.tvl, apy: protocol.apy,
      volume: protocol.volume24h, risk: protocol.riskScore, change: protocol.change24h
    }));
  }, [filteredProtocols]);

  const riskDistributionData = useMemo(() => {
    const distribution = protocols.reduce((acc, protocol) => {
      const riskCategory = protocol.riskScore <= 3 ? 'Low' : protocol.riskScore <= 6 ? 'Medium' : 'High';
      acc[riskCategory] = (acc[riskCategory] || 0) + protocol.tvl;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([risk, value]) => ({
      name: risk, value,
      color: risk === 'Low' ? COLORS.success : risk === 'Medium' ? COLORS.warning : COLORS.danger
    }));
  }, [protocols]);

  const topArbitrageOpportunities = useMemo(() => {
    return arbitrageOpportunities.filter(opp => !opp.isExecuted)
      .sort((a, b) => b.profitPotential - a.profitPotential).slice(0, 5);
  }, [arbitrageOpportunities]);

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />Connect Wallet
            </CardTitle>
            <CardDescription>Connect your wallet to access Base DeFi Analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => window.ethereum?.request({ method: 'eth_requestAccounts' })}>
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Data</AlertTitle>
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={refreshData}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Base DeFi Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive analytics for Base blockchain DeFi protocols</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
          <Button variant={autoRefresh ? 'default' : 'outline'} size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
            <Zap className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />Auto Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={refreshData}>Refresh Data</Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total TVL</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardMetrics.totalTVL)}</div>
            <p className="text-xs text-muted-foreground">Across {dashboardMetrics.activeStrategies} active strategies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dashboardMetrics.totalUsers)}</div>
            <p className="text-xs text-muted-foreground">+12% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardMetrics.totalVolume24h)}</div>
            <p className="text-xs text-muted-foreground">{dashboardMetrics.arbitrageOpportunities} arbitrage opportunities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average APY</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(dashboardMetrics.averageAPY)}</div>
            <p className="text-xs text-muted-foreground">Risk Score: {dashboardMetrics.riskScore}/10</p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Overview */}
      {portfolioMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />Your Portfolio
            </CardTitle>
            <CardDescription>Overview of your DeFi positions and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(portfolioMetrics.totalValue)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">P&L</p>
                <p className={`text-xl font-bold ${portfolioMetrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(portfolioMetrics.totalPnL)}
                  <span className="text-sm ml-1">({formatPercentage(portfolioMetrics.totalPnLPercentage)})</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Rewards</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(portfolioMetrics.totalPendingRewards)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Weighted APY</p>
                <p className="text-xl font-bold">{formatPercentage(portfolioMetrics.weightedAPY)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Risk Level</p>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: RISK_COLORS[Math.round(portfolioMetrics.averageRisk)] }}></div>
                  <p className="text-xl font-bold">{portfolioMetrics.averageRisk.toFixed(1)}/10</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Positions</p>
                <p className="text-xl font-bold">{portfolioMetrics.positionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="protocols" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="protocols">Protocols</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="arbitrage">Arbitrage</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Protocols Tab */}
        <TabsContent value="protocols" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {['all', 'DEX', 'Lending', 'Yield'].map((category) => (
                <Button key={category} variant={selectedCategory === category ? 'default' : 'outline'} size="sm"
                  onClick={() => setSelectedCategory(category as any)}>
                  {category === 'all' ? 'All Protocols' : category}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Protocol TVL Comparison</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={protocolChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="tvl" fill={COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>APY vs Risk Analysis</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={protocolChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="apy" stroke={COLORS.success} name="APY (%)" />
                    <Line yAxisId="right" type="monotone" dataKey="risk" stroke={COLORS.danger} name="Risk Score" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Protocol Details</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredProtocols.map((protocol) => (
                  <div key={protocol.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-semibold">{protocol.name}</h3>
                        <Badge variant="secondary">{protocol.category}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <p className="text-gray-600">TVL</p>
                        <p className="font-semibold">{formatCurrency(protocol.tvl)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">APY</p>
                        <p className="font-semibold text-green-600">{formatPercentage(protocol.apy)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Risk</p>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: RISK_COLORS[protocol.riskScore] }}></div>
                          <p className="font-semibold">{protocol.riskScore}/10</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600">24h Change</p>
                        <p className={`font-semibold ${protocol.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {protocol.change24h >= 0 ? '+' : ''}{formatPercentage(protocol.change24h)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Arbitrage Tab */}
        <TabsContent value="arbitrage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />Top Arbitrage Opportunities
              </CardTitle>
              <CardDescription>Real-time arbitrage opportunities across Base DEXs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topArbitrageOpportunities.map((opportunity) => (
                  <div key={opportunity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{opportunity.tokenA}/{opportunity.tokenB}</h3>
                      <p className="text-sm text-gray-600">{opportunity.dexA} import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge, Button, Progress, Alert, AlertDescription, AlertTitle } from '@/components/ui';
import { TrendingUp, TrendingDown, DollarSign, Users, Activity, PieChart as PieChartIcon, BarChart3, LineChart as LineChartIcon, AlertTriangle, CheckCircle, Clock, Zap, Target, Shield } from 'lucide-react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useBaseAnalytics } from '@/hooks/useBaseAnalytics';
import { formatCurrency, formatPercentage, formatNumber } from '@/utils/formatters';
import { calculateAPY, calculateRisk, calculateOptimalAllocation } from '@/utils/defi';

/**
 * @title DashboardAnalytics
 * @description Comprehensive analytics dashboard for Base DeFi protocols
 * @author Base DeFi Analytics Team
 */

// Types and Interfaces
interface ProtocolData {
  id: string;
  name: string;
  tvl: number;
  apy: number;
  riskScore: number;
  volume24h: number;
  change24h: number;
  isActive: boolean;
  category: 'DEX' | 'Lending' | 'Yield' | 'Derivatives';
}

interface UserPosition {
  strategyId: string;
  strategyName: string;
  amount: number;
  currentValue: number;
  pnl: number;
  pnlPercentage: number;
  apy: number;
  riskLevel: number;
  entryDate: Date;
  lastRewardClaim: Date;
  pendingRewards: number;
}

interface ArbitrageOpportunity {
  id: string;
  tokenA: string;
  tokenB: string;
  dexA: string;
  dexB: string;
  profitPotential: number;
  profitPercentage: number;
  timestamp: Date;
  isExecuted: boolean;
  estimatedGas: number;
}

interface DashboardMetrics {
  totalTVL: number;
  totalUsers: number;
  totalVolume24h: number;
  totalRewardsDistributed: number;
  averageAPY: number;
  activeStrategies: number;
  arbitrageOpportunities: number;
  riskScore: number;
}

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  success: '#22C55E',
  info: '#06B6D4',
  purple: '#8B5CF6',
  pink: '#EC4899'
};

const RISK_COLORS = {
  1: '#22C55E', 2: '#22C55E', 3: '#84CC16', 4: '#84CC16',
  5: '#F59E0B', 6: '#F59E0B', 7: '#F97316', 8: '#F97316',
  9: '#EF4444', 10: '#EF4444'
};

const DashboardAnalytics: React.FC = () => {
  const { account, isConnected } = useWeb3();
  const { protocols, userPositions, arbitrageOpportunities, dashboardMetrics, isLoading, error, refreshData } = useBaseAnalytics();

  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'DEX' | 'Lending' | 'Yield'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => { refreshData(); }, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshData]);

  // Filter protocols by category
  const filteredProtocols = useMemo(() => {
    if (selectedCategory === 'all') return protocols;
    return protocols.filter(protocol => protocol.category === selectedCategory);
  }, [protocols, selectedCategory]);

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    if (!userPositions.length) return null;
    const totalValue = userPositions.reduce((sum, pos) => sum + pos.currentValue, 0);
    const totalPnL = userPositions.reduce((sum, pos) => sum + pos.pnl, 0);
    const totalPendingRewards = userPositions.reduce((sum, pos) => sum + pos.pendingRewards, 0);
    const weightedAPY = userPositions.reduce((sum, pos) => sum + (pos.apy * pos.currentValue / totalValue), 0);
    const averageRisk = userPositions.reduce((sum, pos) => sum + pos.riskLevel, 0) / userPositions.length;

    return {
      totalValue, totalPnL,
      totalPnLPercentage: totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0,
      totalPendingRewards, weightedAPY, averageRisk,
      positionCount: userPositions.length
    };
  }, [userPositions]);

  // Prepare chart data
  const protocolChartData = useMemo(() => {
    return filteredProtocols.map(protocol => ({
      name: protocol.name, tvl: protocol.tvl, apy: protocol.apy,
      volume: protocol.volume24h, risk: protocol.riskScore, change: protocol.change24h
    }));
  }, [filteredProtocols]);

  const riskDistributionData = useMemo(() => {
    const distribution = protocols.reduce((acc, protocol) => {
      const riskCategory = protocol.riskScore <= 3 ? 'Low' : protocol.riskScore <= 6 ? 'Medium' : 'High';
      acc[riskCategory] = (acc[riskCategory] || 0) + protocol.tvl;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([risk, value]) => ({
      name: risk, value,
      color: risk === 'Low' ? COLORS.success : risk === 'Medium' ? COLORS.warning : COLORS.danger
    }));
  }, [protocols]);

  const topArbitrageOpportunities = useMemo(() => {
    return arbitrageOpportunities.filter(opp => !opp.isExecuted)
      .sort((a, b) => b.profitPotential - a.profitPotential).slice(0, 5);
  }, [arbitrageOpportunities]);

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />Connect Wallet
            </CardTitle>
            <CardDescription>Connect your wallet to access Base DeFi Analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => window.ethereum?.request({ method: 'eth_requestAccounts' })}>
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Data</AlertTitle>
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={refreshData}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Base DeFi Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive analytics for Base blockchain DeFi protocols</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
          <Button variant={autoRefresh ? 'default' : 'outline'} size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
            <Zap className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />Auto Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={refreshData}>Refresh Data</Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total TVL</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardMetrics.totalTVL)}</div>
            <p className="text-xs text-muted-foreground">Across {dashboardMetrics.activeStrategies} active strategies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dashboardMetrics.totalUsers)}</div>
            <p className="text-xs text-muted-foreground">+12% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardMetrics.totalVolume24h)}</div>
            <p className="text-xs text-muted-foreground">{dashboardMetrics.arbitrageOpportunities} arbitrage opportunities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average APY</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(dashboardMetrics.averageAPY)}</div>
            <p className="text-xs text-muted-foreground">Risk Score: {dashboardMetrics.riskScore}/10</p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Overview */}
      {portfolioMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />Your Portfolio
            </CardTitle>
            <CardDescription>Overview of your DeFi positions and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(portfolioMetrics.totalValue)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">P&L</p>
                <p className={`text-xl font-bold ${portfolioMetrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(portfolioMetrics.totalPnL)}
                  <span className="text-sm ml-1">({formatPercentage(portfolioMetrics.totalPnLPercentage)})</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Rewards</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(portfolioMetrics.totalPendingRewards)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Weighted APY</p>
                <p className="text-xl font-bold">{formatPercentage(portfolioMetrics.weightedAPY)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Risk Level</p>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: RISK_COLORS[Math.round(portfolioMetrics.averageRisk)] }}></div>
                  <p className="text-xl font-bold">{portfolioMetrics.averageRisk.toFixed(1)}/10</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Positions</p>
                <p className="text-xl font-bold">{portfolioMetrics.positionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="protocols" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="protocols">Protocols</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="arbitrage">Arbitrage</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Protocols Tab */}
        <TabsContent value="protocols" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {['all', 'DEX', 'Lending', 'Yield'].map((category) => (
                <Button key={category} variant={selectedCategory === category ? 'default' : 'outline'} size="sm"
                  onClick={() => setSelectedCategory(category as any)}>
                  {category === 'all' ? 'All Protocols' : category}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Protocol TVL Comparison</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={protocolChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="tvl" fill={COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>APY vs Risk Analysis</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={protocolChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="apy" stroke={COLORS.success} name="APY (%)" />
                    <Line yAxisId="right" type="monotone" dataKey="risk" stroke={COLORS.danger} name="Risk Score" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Arbitrage Tab */}
        <TabsContent value="arbitrage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />Top Arbitrage Opportunities
              </CardTitle>
              <CardDescription>Real-time arbitrage opportunities across Base DEXs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topArbitrageOpportunities.map((opportunity) => (
                  <div key={opportunity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{opportunity.tokenA}/{opportunity.tokenB}</h3>
                      <p className="text-sm text-gray-600">{opportunity.dexA} import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge, Button, Progress, Alert, AlertDescription, AlertTitle } from '@/components/ui';
import { TrendingUp, TrendingDown, DollarSign, Users, Activity, PieChart as PieChartIcon, BarChart3, LineChart as LineChartIcon, AlertTriangle, CheckCircle, Clock, Zap, Target, Shield } from 'lucide-react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useBaseAnalytics } from '@/hooks/useBaseAnalytics';
import { formatCurrency, formatPercentage, formatNumber } from '@/utils/formatters';
import { calculateAPY, calculateRisk, calculateOptimalAllocation } from '@/utils/defi';

/**
 * @title DashboardAnalytics
 * @description Comprehensive analytics dashboard for Base DeFi protocols
 * @author Base DeFi Analytics Team
 */

// Types and Interfaces
interface ProtocolData {
  id: string;
  name: string;
  tvl: number;
  apy: number;
  riskScore: number;
  volume24h: number;
  change24h: number;
  isActive: boolean;
  category: 'DEX' | 'Lending' | 'Yield' | 'Derivatives';
}

interface UserPosition {
  strategyId: string;
  strategyName: string;
  amount: number;
  currentValue: number;
  pnl: number;
  pnlPercentage: number;
  apy: number;
  riskLevel: number;
  entryDate: Date;
  lastRewardClaim: Date;
  pendingRewards: number;
}

interface ArbitrageOpportunity {
  id: string;
  tokenA: string;
  tokenB: string;
  dexA: string;
  dexB: string;
  profitPotential: number;
  profitPercentage: number;
  timestamp: Date;
  isExecuted: boolean;
  estimatedGas: number;
}

interface DashboardMetrics {
  totalTVL: number;
  totalUsers: number;
  totalVolume24h: number;
  totalRewardsDistributed: number;
  averageAPY: number;
  activeStrategies: number;
  arbitrageOpportunities: number;
  riskScore: number;
}

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  success: '#22C55E',
  info: '#06B6D4',
  purple: '#8B5CF6',
  pink: '#EC4899'
};

const RISK_COLORS = {
  1: '#22C55E', 2: '#22C55E', 3: '#84CC16', 4: '#84CC16',
  5: '#F59E0B', 6: '#F59E0B', 7: '#F97316', 8: '#F97316',
  9: '#EF4444', 10: '#EF4444'
};

const DashboardAnalytics: React.FC = () => {
  const { account, isConnected } = useWeb3();
  const { protocols, userPositions, arbitrageOpportunities, dashboardMetrics, isLoading, error, refreshData } = useBaseAnalytics();

  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'DEX' | 'Lending' | 'Yield'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => { refreshData(); }, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshData]);

  // Filter protocols by category
  const filteredProtocols = useMemo(() => {
    if (selectedCategory === 'all') return protocols;
    return protocols.filter(protocol => protocol.category === selectedCategory);
  }, [protocols, selectedCategory]);

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    if (!userPositions.length) return null;
    const totalValue = userPositions.reduce((sum, pos) => sum + pos.currentValue, 0);
    const totalPnL = userPositions.reduce((sum, pos) => sum + pos.pnl, 0);
    const totalPendingRewards = userPositions.reduce((sum, pos) => sum + pos.pendingRewards, 0);
    const weightedAPY = userPositions.reduce((sum, pos) => sum + (pos.apy * pos.currentValue / totalValue), 0);
    const averageRisk = userPositions.reduce((sum, pos) => sum + pos.riskLevel, 0) / userPositions.length;

    return {
      totalValue, totalPnL,
      totalPnLPercentage: totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0,
      totalPendingRewards, weightedAPY, averageRisk,
      positionCount: userPositions.length
    };
  }, [userPositions]);

  // Prepare chart data
  const protocolChartData = useMemo(() => {
    return filteredProtocols.map(protocol => ({
      name: protocol.name, tvl: protocol.tvl, apy: protocol.apy,
      volume: protocol.volume24h, risk: protocol.riskScore, change: protocol.change24h
    }));
  }, [filteredProtocols]);

  const riskDistributionData = useMemo(() => {
    const distribution = protocols.reduce((acc, protocol) => {
      const riskCategory = protocol.riskScore <= 3 ? 'Low' : protocol.riskScore <= 6 ? 'Medium' : 'High';
      acc[riskCategory] = (acc[riskCategory] || 0) + protocol.tvl;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([risk, value]) => ({
      name: risk, value,
      color: risk === 'Low' ? COLORS.success : risk === 'Medium' ? COLORS.warning : COLORS.danger
    }));
  }, [protocols]);

  const topArbitrageOpportunities = useMemo(() => {
    return arbitrageOpportunities.filter(opp => !opp.isExecuted)
      .sort((a, b) => b.profitPotential - a.profitPotential).slice(0, 5);
  }, [arbitrageOpportunities]);

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />Connect Wallet
            </CardTitle>
            <CardDescription>Connect your wallet to access Base DeFi Analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => window.ethereum?.request({ method: 'eth_requestAccounts' })}>
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Data</AlertTitle>
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={refreshData}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Base DeFi Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive analytics for Base blockchain DeFi protocols</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
          <Button variant={autoRefresh ? 'default' : 'outline'} size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
            <Zap className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />Auto Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={refreshData}>Refresh Data</Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total TVL</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardMetrics.totalTVL)}</div>
            <p className="text-xs text-muted-foreground">Across {dashboardMetrics.activeStrategies} active strategies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dashboardMetrics.totalUsers)}</div>
            <p className="text-xs text-muted-foreground">+12% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardMetrics.totalVolume24h)}</div>
            <p className="text-xs text-muted-foreground">{dashboardMetrics.arbitrageOpportunities} arbitrage opportunities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average APY</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(dashboardMetrics.averageAPY)}</div>
            <p className="text-xs text-muted-foreground">Risk Score: {dashboardMetrics.riskScore}/10</p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Overview */}
      {portfolioMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />Your Portfolio
            </CardTitle>
            <CardDescription>Overview of your DeFi positions and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(portfolioMetrics.totalValue)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">P&L</p>
                <p className={`text-xl font-bold ${portfolioMetrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(portfolioMetrics.totalPnL)}
                  <span className="text-sm ml-1">({formatPercentage(portfolioMetrics.totalPnLPercentage)})</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Rewards</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(portfolioMetrics.totalPendingRewards)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Weighted APY</p>
                <p className="text-xl font-bold">{formatPercentage(portfolioMetrics.weightedAPY)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Risk Level</p>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: RISK_COLORS[Math.round(portfolioMetrics.averageRisk)] }}></div>
                  <p className="text-xl font-bold">{portfolioMetrics.averageRisk.toFixed(1)}/10</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Positions</p>
                <p className="text-xl font-bold">{portfolioMetrics.positionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="protocols" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="protocols">Protocols</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="arbitrage">Arbitrage</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Protocols Tab */}
        <TabsContent value="protocols" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {['all', 'DEX', 'Lending', 'Yield'].map((category) => (
                <Button key={category} variant={selectedCategory === category ? 'default' : 'outline'} size="sm"
                  onClick={() => setSelectedCategory(category as any)}>
                  {category === 'all' ? 'All Protocols' : category}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Protocol TVL Comparison</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={protocolChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="tvl" fill={COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>APY vs Risk Analysis</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={protocolChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="apy" stroke={COLORS.success} name="APY (%)" />
                    <Line yAxisId="right" type="monotone" dataKey="risk" stroke={COLORS.danger} name="Risk Score" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Arbitrage Tab */}
        <TabsContent value="arbitrage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />Top Arbitrage Opportunities
              </CardTitle>
              <CardDescription>Real-time arbitrage opportunities across Base DEXs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topArbitrageOpportunities.map((opportunity) => (
                  <div key={opportunity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{opportunity.tokenA}/{opportunity.tokenB}</h3>
                      <p className="text-sm text-gray-600">{opportunity.dexA} to {opportunity.dexB}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">+{formatCurrency(opportunity.profitPotential)}</p>
                      <p className="text-sm text-gray-600">{formatPercentage(opportunity.profitPercentage)} profit</p>
                    </div>
                    <Button size="sm">Execute</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Risk Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={riskDistributionData} cx="50%" cy="50%" labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80} fill="#8884d8" dataKey="value">
                      {riskDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Volume Trends</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={protocolChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Area type="monotone" dataKey="volume" stroke={COLORS.info} fill={COLORS.info} fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardAnalytics;
