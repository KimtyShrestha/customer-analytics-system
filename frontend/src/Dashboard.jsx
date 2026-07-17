import { useEffect, useState } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { getDashboard } from './api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler);

const npr = (n) => 'NPR ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const SEGMENT_COLOURS = {
  repeat: '#2563EB', new: '#16A34A', at_risk: '#F59E0B',
  dormant: '#DC2626', occasional: '#9CA3AF',
};

const baseOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } },
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="state">Failed to load: {error}</div>;
  if (!data) return <div className="state">Loading analytics…</div>;

  const k = data.kpis;

  return (
    <div className="content">
      <div className="kpi-grid">
        <div className="kpi">
          <div className="label">Identified Customers</div>
          <div className="value">{k.total_customers}</div>
          <div className="sub">From pilot collection period</div>
        </div>
        <div className="kpi">
          <div className="label">Repeat Customers</div>
          <div className="value">{k.repeat_customers}</div>
          <div className="sub">{k.repeat_rate}% of identified customers</div>
        </div>
        <div className="kpi">
          <div className="label">At Risk</div>
          <div className="value">{k.at_risk_customers}</div>
          <div className="sub">Approaching inactivity threshold</div>
        </div>
        <div className="kpi">
          <div className="label">Dormant</div>
          <div className="value">{k.dormant_customers}</div>
          <div className="sub">Beyond calibrated threshold</div>
        </div>
        <div className="kpi">
          <div className="label">Average Customer Spend</div>
          <div className="value" style={{ fontSize: 24 }}>{npr(k.avg_customer_spend)}</div>
          <div className="sub">Mean invoice value per customer</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="card">
          <h3>Customer Visit Trend</h3>
          <p className="caption">Daily visits across the pilot period</p>
          <div className="chart-wrap">
            <Line
              data={{
                labels: data.visitTrend.map((d) => d.date.slice(5)),
                datasets: [{
                  data: data.visitTrend.map((d) => Number(d.visits)),
                  borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.08)',
                  fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2,
                }],
              }}
              options={baseOpts}
            />
          </div>
        </div>

        <div className="card">
          <h3>Segment Distribution</h3>
          <p className="caption">Calibrated recency and frequency rules</p>
          <div className="chart-wrap">
            <Doughnut
              data={{
                labels: data.segmentDistribution.map((s) => s.segment.replace('_', ' ')),
                datasets: [{
                  data: data.segmentDistribution.map((s) => Number(s.count)),
                  backgroundColor: data.segmentDistribution.map((s) => SEGMENT_COLOURS[s.segment]),
                  borderWidth: 0,
                }],
              }}
              options={{
                responsive: true, maintainAspectRatio: false, cutout: '62%',
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, font: { size: 12 } } } },
              }}
            />
          </div>
        </div>
      </div>

      <div className="chart-grid equal">
        <div className="card">
          <h3>Monthly Revenue</h3>
          <p className="caption">Total invoice value by month</p>
          <div className="chart-wrap">
            <Bar
              data={{
                labels: data.revenueTrend.map((r) => r.month),
                datasets: [{
                  data: data.revenueTrend.map((r) => Number(r.revenue)),
                  backgroundColor: '#2563EB', borderRadius: 6, barThickness: 44,
                }],
              }}
              options={baseOpts}
            />
          </div>
        </div>

        <div className="card">
          <h3>Payment Methods</h3>
          <p className="caption">Visits by payment type</p>
          <div className="chart-wrap">
            <Bar
              data={{
                labels: data.paymentDistribution.map((p) => p.payment_method || 'Unknown'),
                datasets: [{
                  data: data.paymentDistribution.map((p) => Number(p.count)),
                  backgroundColor: '#16A34A', borderRadius: 6, barThickness: 40,
                }],
              }}
              options={baseOpts}
            />
          </div>
        </div>
      </div>
    </div>
  );
}