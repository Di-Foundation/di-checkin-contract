// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title DI Daily Check-In
/// @notice Records direct wallet check-ins for DI campaigns on BNB Chain.
/// @dev Day boundaries are anchored to startTime. Deploy with startTime set to
///      00:00 Asia/Shanghai when the campaign should use Beijing calendar days.
contract DICheckIn is Ownable2Step, Pausable {
    uint256 public constant DAY_SECONDS = 1 days;

    struct UserState {
        uint32 lastCheckInDay;
        uint32 totalCheckIns;
        uint16 currentStreak;
        uint16 longestStreak;
        bool qualified;
    }

    uint64 public immutable startTime;
    uint16 public immutable campaignDays;
    uint16 public immutable requiredStreak;

    uint256 public uniqueUsers;
    uint256 public totalCheckIns;

    mapping(address user => UserState state) public users;
    mapping(uint32 day => uint32 count) public dailyCheckIns;

    error AlreadyCheckedIn(uint32 day);
    error CampaignEnded();
    error CampaignNotStarted();
    error InvalidCampaignDays();
    error InvalidRequiredStreak();
    error InvalidStartTime();
    error OwnershipRenunciationDisabled();

    event CheckedIn(
        address indexed user,
        uint32 indexed day,
        uint16 currentStreak,
        uint16 longestStreak
    );
    event Qualified(address indexed user, uint32 indexed day, uint16 requiredStreak);

    constructor(
        uint64 startTime_,
        uint16 campaignDays_,
        uint16 requiredStreak_
    ) Ownable(msg.sender) {
        if (startTime_ <= block.timestamp) revert InvalidStartTime();
        if (campaignDays_ == 0) revert InvalidCampaignDays();
        if (requiredStreak_ == 0 || requiredStreak_ > campaignDays_) {
            revert InvalidRequiredStreak();
        }

        startTime = startTime_;
        campaignDays = campaignDays_;
        requiredStreak = requiredStreak_;
    }

    /// @return dayIndex Zero before the campaign, then one-based campaign day.
    function currentDay() public view returns (uint32 dayIndex) {
        if (block.timestamp < startTime) return 0;
        return uint32((block.timestamp - startTime) / DAY_SECONDS + 1);
    }

    function campaignActive() public view returns (bool) {
        uint32 day = currentDay();
        return day != 0 && day <= campaignDays;
    }

    function canCheckInToday(address user) public view returns (bool) {
        uint32 day = currentDay();
        return
            user != address(0) &&
            !paused() &&
            day != 0 &&
            day <= campaignDays &&
            users[user].lastCheckInDay != day;
    }

    function isQualified(address user) external view returns (bool) {
        return users[user].qualified;
    }

    /// @notice Records one check-in for msg.sender. The caller pays the chain gas.
    function checkIn() external whenNotPaused {
        uint32 day = currentDay();
        if (day == 0) revert CampaignNotStarted();
        if (day > campaignDays) revert CampaignEnded();

        UserState storage state = users[msg.sender];
        if (state.lastCheckInDay == day) revert AlreadyCheckedIn(day);

        if (state.totalCheckIns == 0) {
            uniqueUsers += 1;
        }

        if (state.lastCheckInDay != 0 && state.lastCheckInDay + 1 == day) {
            state.currentStreak += 1;
        } else {
            state.currentStreak = 1;
        }

        state.lastCheckInDay = day;
        state.totalCheckIns += 1;

        if (state.currentStreak > state.longestStreak) {
            state.longestStreak = state.currentStreak;
        }

        totalCheckIns += 1;
        dailyCheckIns[day] += 1;

        if (!state.qualified && state.longestStreak >= requiredStreak) {
            state.qualified = true;
            emit Qualified(msg.sender, day, requiredStreak);
        }

        emit CheckedIn(
            msg.sender,
            day,
            state.currentStreak,
            state.longestStreak
        );
    }

    /// @notice Stops new check-ins during an incident. Existing records are unchanged.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Resumes check-ins after an incident.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @dev A zero pending owner is not accepted as a cancellation mechanism because
    ///      it is ambiguous in operational audit trails. Start another valid transfer
    ///      to replace a mistaken pending owner.
    function transferOwnership(address newOwner) public override onlyOwner {
        if (newOwner == address(0)) revert OwnableInvalidOwner(address(0));
        super.transferOwnership(newOwner);
    }

    /// @dev Prevents a paused deployment from becoming permanently unrecoverable.
    function renounceOwnership() public override onlyOwner {
        revert OwnershipRenunciationDisabled();
    }
}
