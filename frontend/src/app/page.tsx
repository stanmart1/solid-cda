import Link from 'next/link'; // Link is still needed if Button doesn't handle NextLink specific props
import Button from '@/components/Button'; // Import Button

export default function HomePage() {
  return (
    <div className="text-center py-10">
      <h1 className="text-5xl font-bold my-8 text-base-content leading-tight">Welcome to <span className="text-primary">SolidCDA</span></h1>
      <p className="text-xl text-gray-700 mb-12 max-w-2xl mx-auto">
        Your comprehensive platform for efficient Community Development Association management.
      </p>
      <div className="space-x-6">
        <Button href="/login" variant="primary" size="lg">
          Login
        </Button>
        <Button href="/register" variant="secondary" size="lg">
          Register
        </Button>
      </div>
      <div className="mt-20 p-8 bg-white rounded-xl shadow-2xl max-w-3xl mx-auto">
        <h2 className="text-3xl font-semibold text-base-content mb-6">Key Features:</h2>
        <ul className="list-disc list-inside text-left text-gray-600 space-y-2">
          <li>Manage Memberships and User Roles</li>
          <li>Secure Online Payment Processing</li>
          <li>Community Announcements and Notifications</li>
          <li>Conduct Polls and Voting</li>
          <li>Streamlined Complaint Management</li>
          <li>Transparent Accounting Features</li>
        </ul>
      </div>
    </div>
  );
}
