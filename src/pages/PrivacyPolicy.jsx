export default function PrivacyPolicy() {
    return (
      <div className="min-h-screen bg-zinc-900 text-white p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Privacy Policy</h1>
  
        <p>
          Your privacy is important to us. This app ("Trans") collects and processes
          only the information necessary to provide translation services.
        </p>
  
        <h2 className="mt-6 text-xl font-semibold">Data Collection</h2>
        <p>
          We do not store any personal data or translation input on our servers. All translation
          requests are processed in-memory and no logs of your text inputs are kept.
        </p>
  
        <h2 className="mt-6 text-xl font-semibold">Third-Party Services</h2>
        <p>
          If you use speech recognition or text-to-speech features, these may rely on third-party
          services, which may collect limited data as per their own privacy policies.
        </p>
  
        <h2 className="mt-6 text-xl font-semibold">Cookies and Tracking</h2>
        <p>
          This app does not use cookies or tracking technologies.
        </p>
  
        <h2 className="mt-6 text-xl font-semibold">Contact Us</h2>
        <p>
          For any questions about this privacy policy, please contact us at <a href="mailto:hibon.technologies@gmail.com" className="text-yellow-500 underline">hibon.technologies@gmail.com</a>.
        </p>
      </div>
    );
  }
  