import React from "react";

const MonitoringDashboard = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Multi-Test System Monitoring</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-600">Total Executions</h3>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-600">API Calls Saved</h3>
          <p className="text-2xl font-bold text-green-600">0</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-600">Avg Efficiency</h3>
          <p className="text-2xl font-bold text-purple-600">0x</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-600">Success Rate</h3>
          <p className="text-2xl font-bold text-green-600">0%</p>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
