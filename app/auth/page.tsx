import AuthWrapper from '@/components/auth/AuthWrapper';

export default function AuthPageDemo() {
  return (
    <AuthWrapper>
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Welcome to Mariposa Dashboard</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Trading Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border">
              <h2 className="text-xl font-semibold mb-4">Trading</h2>
              <p className="text-gray-600 mb-4">
                Access DragonSwap and start trading cryptocurrencies
              </p>
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
                Start Trading
              </button>
            </div>

            {/* Wallet Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border">
              <h2 className="text-xl font-semibold mb-4">Wallet</h2>
              <p className="text-gray-600 mb-4">
                Manage your cryptocurrencies and view balances
              </p>
              <button className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
                View Wallet
              </button>
            </div>

            {/* AI Agents Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border">
              <h2 className="text-xl font-semibold mb-4">AI Agents</h2>
              <p className="text-gray-600 mb-4">
                Deploy automated trading agents
              </p>
              <button className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700">
                Manage Agents
              </button>
            </div>
          </div>

          <div className="mt-8 bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">🎉 You're all set!</h3>
            <p className="text-gray-700">
              Your wallet has been created and your account is ready. You can now:
            </p>
            <ul className="list-disc list-inside mt-2 text-gray-700">
              <li>Deposit cryptocurrencies to your wallet</li>
              <li>Start trading on DragonSwap</li>
              <li>Set up automated trading agents</li>
              <li>Monitor your portfolio performance</li>
            </ul>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
} 