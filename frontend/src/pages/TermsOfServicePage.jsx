import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            <Link 
              to="/" 
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Home
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Terms of Service</h1>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="prose prose-lg max-w-none">
            <h1 className="text-3xl font-bold text-blue-600 mb-8">Terms of Service</h1>
            
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> January 2024
            </p>
            
            <h2 className="text-2xl font-semibold text-blue-600 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-6">
              By accessing and using our Excel Analytics Platform service, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>

            <h2 className="text-2xl font-semibold text-blue-600 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 mb-6">
              Our Excel Analytics Platform provides users with tools to upload, analyze, and visualize Excel files and data. The service includes file management, data analytics, chart generation, and dashboard features.
            </p>

            <h2 className="text-2xl font-semibold text-blue-600 mb-4">3. User Accounts</h2>
            <p className="text-gray-700 mb-4">
              To access certain features of the service, you must register for an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 ml-4">
              <li>Provide true, accurate, current, and complete information about yourself</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and identification</li>
              <li>Be fully responsible for all activities that occur under your account</li>
            </ul>

            <h2 className="text-2xl font-semibold text-blue-600 mb-4">4. Acceptable Use Policy</h2>
            <p className="text-gray-700 mb-4">
              You agree not to use the service to:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 ml-4">
              <li>Upload or transmit any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable</li>
              <li>Violate any applicable local, state, national, or international law</li>
              <li>Transmit any material that contains viruses, worms, or other harmful computer code</li>
              <li>Interfere with or disrupt the service or servers connected to the service</li>
              <li>Attempt to gain unauthorized access to any portion of the service</li>
            </ul>

            <h2 className="text-2xl font-semibold text-blue-600 mb-4">5. Data and Privacy</h2>
            <p className="text-gray-700 mb-6">
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service, to understand our practices regarding the collection and use of your information.
            </p>

            <h2 className="text-2xl font-semibold text-blue-600 mb-4">6. File Upload and Storage</h2>
            <p className="text-gray-700 mb-6">
              You retain ownership of the data you upload to our platform. However, by uploading files, you grant us a limited license to process, analyze, and display your data for the purpose of providing our services. We implement security measures to protect your data, but you are responsible for ensuring your data complies with applicable laws and regulations.
            </p>

            <h2 className="text-2xl font-semibold text-blue-600 mb-4">7. Service Availability</h2>
            <p className="text-gray-700 mb-6">
              We strive to maintain high service availability but do not guarantee that the service will be available at all times. The service may be temporarily unavailable due to maintenance, updates, or technical issues.
            </p>

            <h2 className="text-2xl font-semibold text-blue-600 mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-700 mb-6">
              In no event shall our company be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the service.
            </p>

            <h2 className="text-2xl font-semibold text-blue-600 mb-4">9. Termination</h2>
            <p className="text-gray-700 mb-6">
              We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>

            <h2 className="text-2xl font-semibold text-blue-600 mb-4">10. Changes to Terms</h2>
            <p className="text-gray-700 mb-6">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
            </p>

            <h2 className="text-2xl font-semibold text-blue-600 mb-4">11. Contact Information</h2>
            <p className="text-gray-700 mb-6">
              If you have any questions about these Terms of Service, please contact us at support@excelanalytics.com.
            </p>

            <div className="border-t pt-6 mt-8">
              <p className="text-sm text-gray-500">
                These terms are effective as of January 2024 and will remain in effect except with respect to any changes in their provisions in the future.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
