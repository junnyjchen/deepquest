// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "@openzeppelin/contracts@4.9.6/token/ERC20/utils/SafeERC20.sol";
import "./DQMiningStakeCore.sol";

contract DQMiningStakeMine is DQMiningStakeCore {
    using SafeERC20 for IERC20;

    // ============ 分配备用接收地址 ============
    bool public nodeDistributionEnabled = false;  // 默认关闭
    address public nodeReceiver = 0x822682A54C454e938374e9690420cdFA264A18Aa;  // 节点接收地址

    event NodeDistributionEnabled(bool enabled);
    event NodeReceiverUpdated(address indexed receiver);

    function setNodeDistributionEnabled(bool _enabled) external onlyOwner {
        nodeDistributionEnabled = _enabled;
        emit NodeDistributionEnabled(_enabled);
    }

    function setNodeReceiver(address _receiver) external onlyOwner {
        require(_receiver != address(0), "!0");
        nodeReceiver = _receiver;
        emit NodeReceiverUpdated(_receiver);
    }

    // ============ 爆块逻辑 V5 ============
    // 释放：未爆块量 × 1.3%
    // 销毁：80%起每天递减0.5%至30%停止
    // 分配：LP 60%, 节点 15%(A4:B5:C6), D等级 14%(D1-D8各1.75%), 基金会 5%, 创始人 6%
    function mine() external onlyM {
        require(block.timestamp >= lt + 1 days, "!time");
        lt = block.timestamp;

        // 1. 计算释放量 = 未爆块量 × 1.3%
        uint256 unreleased = INITIAL_SUPPLY - releasedSupply;
        if (unreleased == 0) return;
        uint256 release = unreleased * RT / 1000; // RT=13, 即1.3%
        releasedSupply += release;

        // 检查合约DQ余额是否足够
        uint256 dqBalance = IERC20(DQ_TOKEN).balanceOf(address(this));
        require(dqBalance >= release, "!DQ");

        // 2. 计算销毁量（当前销毁率）
        uint256 burnAmount = release * br / 10000;

        // 3. 更新销毁率（每天递减0.5%，最低30%）
        if (br > MB) br -= BD;

        // 4. 分配剩余部分
        uint256 distribute = release - burnAmount;
        if (distribute == 0) return;

        // 4.1 LP持有者 60%（按LP加权分配，无LP则留在合约）
        uint256 lpReward = distribute * 60 / 100;
        if (lpReward > 0 && tLP > 0) {
            lA += lpReward * 1e12 / tLP;
        }
        // 无LP则留在合约，不转出

        // 4.2 节点 15%（A:B:C = 4:5:6，级内均分）
        uint256 nodeReward = distribute * 15 / 100;
        if (nodeReward > 0) {
            if (nodeDistributionEnabled) {
                // 开启分配：按节点类型分配给持有者
                uint256 totalNodeWeight = 15; // 4+5+6
                uint256 aCount = dc.totalA();
                uint256 bCount = dc.totalB();
                uint256 cCount = dc.totalC();
                
                if (aCount > 0 || bCount > 0 || cCount > 0) {
                    if (aCount > 0) nA[0] += nodeReward * 4 * 1e12 / totalNodeWeight / aCount;
                    if (bCount > 0) nA[1] += nodeReward * 5 * 1e12 / totalNodeWeight / bCount;
                    if (cCount > 0) nA[2] += nodeReward * 6 * 1e12 / totalNodeWeight / cCount;
                } else {
                    // 无节点持有者，转到备用地址
                    IERC20(DQ_TOKEN).safeTransfer(nodeReceiver, nodeReward);
                }
            } else {
                // 未开启：全部转到指定地址
                IERC20(DQ_TOKEN).safeTransfer(nodeReceiver, nodeReward);
            }
        }

        // 4.3 团队D等级 14%（D1-D8各1.75%，级内均分，无D等级则留在合约）
        uint256 dReward = distribute * 14 / 100;
        if (dReward > 0) {
            bool hasDLevel = false;
            for (uint8 i; i < 8; i++) {
                if (dLevelCount[i] > 0) {
                    hasDLevel = true;
                    break;
                }
            }
            
            if (hasDLevel) {
                uint256 perLevel = dReward * 175 / 10000; // 1.75% = 175/10000
                for (uint8 i; i < 8; i++) {
                    if (dLevelCount[i] > 0) {
                        dLevelAccReward[i] += perLevel * 1e12 / dLevelCount[i];
                    }
                }
            }
            // 无D等级则留在合约，不转出
        }

        // 4.4 基金会 5%（直接转账）
        uint256 foundationReward = distribute * 5 / 100;
        if (foundationReward > 0) {
            IERC20(DQ_TOKEN).safeTransfer(FOUNDATION, foundationReward);
        }

        // 4.5 创始人 6%（直接转账）
        uint256 creatorReward = distribute * 6 / 100;
        if (creatorReward > 0) {
            IERC20(DQ_TOKEN).safeTransfer(PARTNER, creatorReward);
        }

        // 5. 销毁
        if (burnAmount > 0) {
            IDQToken(dq).burn(burnAmount);
        }
    }

    // ============ 爆块查询函数 ============

    /// @notice 查询本次爆块需要的DQ释放量
    function getMineInfo() public view returns (
        uint256 releaseAmount,
        uint256 currentBurnRate,
        uint256 nextBurnRate,
        bool canMine
    ) {
        canMine = block.timestamp >= lt + 1 days;
        uint256 unreleased = INITIAL_SUPPLY - releasedSupply;
        releaseAmount = unreleased * RT / 1000;
        currentBurnRate = br;
        nextBurnRate = br > MB + BD ? br - BD : MB;
    }

    /// @notice 简化查询：只返回需要转入的DQ数量
    function getMineReleaseAmount() public view returns (uint256) {
        uint256 unreleased = INITIAL_SUPPLY - releasedSupply;
        return unreleased * RT / 1000;
    }

    /// @notice 接收DQ销毁
    function addPendingBurn(uint256 _amount) external {
        require(msg.sender == miningContract || msg.sender == address(dq), "!auth");
        uint256 burnAmt = _amount * 94 / 100;
        if (burnAmt > 0) IDQToken(dq).burn(burnAmt);
    }
}
