import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className={styles.dashboard}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>シフト管理システム</h1>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name}さん</span>
            <button onClick={handleLogout} className={styles.logoutButton}>
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className={styles.main}>
        {/* 統計カード */}
        <section className={styles.statsSection}>
          <h2 className={styles.sectionTitle}>今日の統計</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3>出勤予定</h3>
              <p className={styles.statNumber}>8</p>
              <p className={styles.statLabel}>人</p>
            </div>
            <div className={styles.statCard}>
              <h3>シフト未設定</h3>
              <p className={styles.statNumber}>2</p>
              <p className={styles.statLabel}>日</p>
            </div>
            <div className={styles.statCard}>
              <h3>今月の総労働時間</h3>
              <p className={styles.statNumber}>156</p>
              <p className={styles.statLabel}>時間</p>
            </div>
            <div className={styles.statCard}>
              <h3>シフト希望</h3>
              <p className={styles.statNumber}>3</p>
              <p className={styles.statLabel}>件</p>
            </div>
          </div>
        </section>

        {/* クイックアクション */}
        <section className={styles.actionsSection}>
          <h2 className={styles.sectionTitle}>クイックアクション</h2>
          <div className={styles.actionsGrid}>
            <button 
              className={styles.actionButton}
              onClick={() => navigate('/shifts')}
            >
              <span className={styles.actionIcon}>📅</span>
              <span>シフト管理</span>
            </button>
            <button 
              className={styles.actionButton}
              onClick={() => navigate('/employees')}
            >
              <span className={styles.actionIcon}>👥</span>
              <span>従業員管理</span>
            </button>
            <button 
              className={styles.actionButton}
              onClick={() => navigate('/attendance')}
            >
              <span className={styles.actionIcon}>⏰</span>
              <span>出退勤記録</span>
            </button>
            <button className={styles.actionButton}>
              <span className={styles.actionIcon}>💰</span>
              <span>給与計算</span>
            </button>
          </div>
        </section>

        {/* 最近のアクティビティ */}
        <section className={styles.activitySection}>
          <h2 className={styles.sectionTitle}>最近のアクティビティ</h2>
          <div className={styles.activityList}>
            <div className={styles.activityItem}>
              <span className={styles.activityTime}>10:30</span>
              <span className={styles.activityText}>田中さんがシフト希望を提出しました</span>
            </div>
            <div className={styles.activityItem}>
              <span className={styles.activityTime}>09:15</span>
              <span className={styles.activityText}>佐藤さんが出勤しました</span>
            </div>
            <div className={styles.activityItem}>
              <span className={styles.activityTime}>昨日</span>
              <span className={styles.activityText}>新しい従業員が登録されました</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard; 