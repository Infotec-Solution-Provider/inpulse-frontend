'use client';

import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Metric, QueryResult } from '@/types/reports';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899'];

interface Props {
  metric: Metric;
  data?: QueryResult;
  status: 'pending' | 'done' | 'failed';
  error?: string;
}

export function MetricVisualizer({ metric, data, status, error }: Props) {
  const renderContent = () => {
    if (status === 'pending') {
      return (
        <div className="flex items-center justify-center h-40">
          <CircularProgress size={32} />
        </div>
      );
    }

    if (status === 'failed' || !data) {
      return (
        <div className="flex items-center justify-center h-40 text-red-500">
          <Typography variant="body2">{error ?? 'Erro ao carregar'}</Typography>
        </div>
      );
    }

    const { rows, columns } = data;

    if (metric.visualizationType === 'card') {
      const value = rows[0]?.[columns[0]] ?? '—';
      return (
        <div className="flex flex-col items-center justify-center h-32">
          <Typography variant="h3" fontWeight={700} color="primary">
            {String(value)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {metric.aggregation.toUpperCase()} · {metric.column}
          </Typography>
        </div>
      );
    }

    if (metric.visualizationType === 'table') {
      return (
        <div className="overflow-auto max-h-72">
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell key={col}>{col}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col}>{String(row[col] ?? '')}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    const xKey = metric.groupBy ?? columns[0];
    const yKey = columns.find((c) => c !== xKey) ?? columns[1] ?? columns[0];

    if (metric.visualizationType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={rows} dataKey={yKey} nameKey={xKey} outerRadius={80} label>
              {rows.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (metric.visualizationType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey={yKey} stroke={COLORS[0]} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    // default: bar
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey={yKey} fill={COLORS[0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="subtitle2" fontWeight={600} noWrap>
        {metric.name}
      </Typography>
      {renderContent()}
    </Paper>
  );
}
