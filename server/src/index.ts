import express from "express";
import cors from "cors";
import { adminLogin, getAdmins, createAdmin } from './routes/admin';
import { getUsers, getUserByAddress, getUserDeposits, getUserRewards, getUserWithdrawals, getUserTeam, getUserStats } from './routes/users';
import { getDeposits, getRewards, getWithdrawals, getBlockRewards, getDepositStats } from './routes/transactions';
import { getPartners, getPartnerByAddress, updatePartnerStatus, getPartnerStats } from './routes/partners';
import { getCards, mintCards, getCardStats } from './routes/cards';
import { getPools, getPoolByName, updatePoolBalance, initPools, getPoolStats } from './routes/pools';
import { getDLevelStats, getUserDLevel, getDLevelSummary } from './routes/dlevel';
import { getContractConfigs, getConfig, updateConfig, initDefaultConfigs } from './routes/config';
import { logOperation, getOperationLogs } from './routes/logs';
import { getDashboardStats, getDepositTrend } from './routes/dashboard';
import nodeApplicationsRouter from './routes/node-applications';

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ============ Health Check ============
app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// ============ Dashboard ============
app.get('/api/v1/dashboard/stats', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/dashboard/trend', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const trend = await getDepositTrend(days);
    res.json(trend);
  } catch (error: any) {
    console.error('Deposit trend error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ Admin ============
app.post('/api/v1/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码必填' });
    }
    const admin = await adminLogin(username, password);
    res.json(admin);
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(401).json({ error: error.message });
  }
});

app.get('/api/v1/admin/list', async (req, res) => {
  try {
    const admins = await getAdmins();
    res.json(admins);
  } catch (error: any) {
    console.error('Get admins error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/admin/create', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码必填' });
    }
    const admin = await createAdmin(username, password, role);
    res.json(admin);
  } catch (error: any) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ Users ============
app.get('/api/v1/users', async (req, res) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      search: req.query.search as string,
      level: req.query.level ? parseInt(req.query.level as string) : undefined,
      isPartner: req.query.isPartner === 'true' ? true : req.query.isPartner === 'false' ? false : undefined,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    };
    const result = await getUsers(params);
    res.json(result);
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/users/stats', async (req, res) => {
  try {
    const stats = await getUserStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/users/:address', async (req, res) => {
  try {
    const user = await getUserByAddress(req.params.address);
    res.json(user);
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(404).json({ error: error.message });
  }
});

app.get('/api/v1/users/:address/deposits', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = await getUserDeposits(req.params.address, page, pageSize);
    res.json(result);
  } catch (error: any) {
    console.error('Get user deposits error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/users/:address/rewards', async (req, res) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      rewardType: req.query.rewardType as string,
    };
    const result = await getUserRewards(req.params.address, params);
    res.json(result);
  } catch (error: any) {
    console.error('Get user rewards error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/users/:address/withdrawals', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = await getUserWithdrawals(req.params.address, page, pageSize);
    res.json(result);
  } catch (error: any) {
    console.error('Get user withdrawals error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/users/:address/team', async (req, res) => {
  try {
    const team = await getUserTeam(req.params.address);
    res.json(team);
  } catch (error: any) {
    console.error('Get user team error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ Deposits & Transactions ============
app.get('/api/v1/deposits', async (req, res) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      search: req.query.search as string,
      status: req.query.status as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };
    const result = await getDeposits(params);
    res.json(result);
  } catch (error: any) {
    console.error('Get deposits error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/deposits/stats', async (req, res) => {
  try {
    const stats = await getDepositStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Get deposit stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/rewards', async (req, res) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      userAddress: req.query.userAddress as string,
      rewardType: req.query.rewardType as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };
    const result = await getRewards(params);
    res.json(result);
  } catch (error: any) {
    console.error('Get rewards error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/withdrawals', async (req, res) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      userAddress: req.query.userAddress as string,
      status: req.query.status as string,
      withdrawType: req.query.withdrawType as string,
    };
    const result = await getWithdrawals(params);
    res.json(result);
  } catch (error: any) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/blocks', async (req, res) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
    };
    const result = await getBlockRewards(params);
    res.json(result);
  } catch (error: any) {
    console.error('Get blocks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ Partners ============
app.get('/api/v1/partners', async (req, res) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      status: req.query.status as string,
    };
    const result = await getPartners(params);
    res.json(result);
  } catch (error: any) {
    console.error('Get partners error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/partners/stats', async (req, res) => {
  try {
    const stats = await getPartnerStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Get partner stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/partners/:address', async (req, res) => {
  try {
    const partner = await getPartnerByAddress(req.params.address);
    res.json(partner);
  } catch (error: any) {
    console.error('Get partner error:', error);
    res.status(404).json({ error: error.message });
  }
});

app.put('/api/v1/partners/:address/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: '状态必填' });
    }
    const partner = await updatePartnerStatus(req.params.address, status);
    res.json(partner);
  } catch (error: any) {
    console.error('Update partner status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ Cards ============
app.get('/api/v1/cards', async (req, res) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      cardType: req.query.cardType ? parseInt(req.query.cardType as string) : undefined,
      ownerAddress: req.query.ownerAddress as string,
      status: req.query.status as string,
    };
    const result = await getCards(params);
    res.json(result);
  } catch (error: any) {
    console.error('Get cards error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/cards/stats', async (req, res) => {
  try {
    const stats = await getCardStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Get card stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/cards/mint', async (req, res) => {
  try {
    const { cards } = req.body;
    if (!cards || !Array.isArray(cards)) {
      return res.status(400).json({ error: '卡牌数据必填' });
    }
    const result = await mintCards(cards);
    res.json(result);
  } catch (error: any) {
    console.error('Mint cards error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ Pools ============
app.get('/api/v1/pools', async (req, res) => {
  try {
    const pools = await getPools();
    res.json(pools);
  } catch (error: any) {
    console.error('Get pools error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/pools/stats', async (req, res) => {
  try {
    const stats = await getPoolStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Get pool stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/pools/:name', async (req, res) => {
  try {
    const pool = await getPoolByName(req.params.name);
    res.json(pool);
  } catch (error: any) {
    console.error('Get pool error:', error);
    res.status(404).json({ error: error.message });
  }
});

app.put('/api/v1/pools/:name', async (req, res) => {
  try {
    const { balanceChange } = req.body;
    const pool = await updatePoolBalance(req.params.name, balanceChange);
    res.json(pool);
  } catch (error: any) {
    console.error('Update pool error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/pools/init', async (req, res) => {
  try {
    const result = await initPools();
    res.json(result);
  } catch (error: any) {
    console.error('Init pools error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ D-Level Stats ============
app.get('/api/v1/dlevel', async (req, res) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      dLevel: req.query.dLevel ? parseInt(req.query.dLevel as string) : undefined,
    };
    const result = await getDLevelStats(params);
    res.json(result);
  } catch (error: any) {
    console.error('Get dlevel error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/dlevel/summary', async (req, res) => {
  try {
    const summary = await getDLevelSummary();
    res.json(summary);
  } catch (error: any) {
    console.error('Get dlevel summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/dlevel/user/:address', async (req, res) => {
  try {
    const stats = await getUserDLevel(req.params.address);
    res.json(stats);
  } catch (error: any) {
    console.error('Get user dlevel error:', error);
    res.status(404).json({ error: error.message });
  }
});

// ============ Config ============
app.get('/api/v1/config', async (req, res) => {
  try {
    const configs = await getContractConfigs();
    res.json(configs);
  } catch (error: any) {
    console.error('Get configs error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/config/:key', async (req, res) => {
  try {
    const config = await getConfig(req.params.key);
    res.json(config);
  } catch (error: any) {
    console.error('Get config error:', error);
    res.status(404).json({ error: error.message });
  }
});

app.put('/api/v1/config/:key', async (req, res) => {
  try {
    const { value, description, updatedBy } = req.body;
    const config = await updateConfig(req.params.key, value, description, updatedBy);
    res.json(config);
  } catch (error: any) {
    console.error('Update config error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/config/init', async (req, res) => {
  try {
    const result = await initDefaultConfigs();
    res.json(result);
  } catch (error: any) {
    console.error('Init configs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ Logs ============
app.get('/api/v1/logs', async (req, res) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      adminId: req.query.adminId ? parseInt(req.query.adminId as string) : undefined,
      action: req.query.action as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };
    const result = await getOperationLogs(params);
    res.json(result);
  } catch (error: any) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/logs', async (req, res) => {
  try {
    const log = await logOperation(req.body);
    res.json(log);
  } catch (error: any) {
    console.error('Log operation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ Node Applications ============
app.use('/api/v1/node-applications', nodeApplicationsRouter);

app.listen(port, () => {
  console.log(`DQ Admin Server listening at http://localhost:${port}/`);
});
