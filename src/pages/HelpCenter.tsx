import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Search,
  Play,
  HelpCircle,
  MessageSquare,
  BookOpen,
  CreditCard,
  FolderKanban,
  User,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface FAQItem {
  id: string;
  category: 'billing' | 'projects' | 'account' | 'general' | 'troubleshooting';
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: 'faq-2',
    category: 'billing',
    question: 'What payment methods are supported for invoices?',
    answer: 'Our billing system is integrated with Razorpay, which supports all major credit/debit cards, UPI payments, Netbanking, Apple Pay, and popular digital wallets. All transactions are securely processed and end-to-end encrypted.'
  },
  {
    id: 'faq-3',
    category: 'billing',
    question: 'My payment succeeded but the invoice still shows as unpaid. What should I do?',
    answer: 'Invoice statuses are updated in real-time. In rare network circumstances, there may be a 1-2 minute delay. Please try refreshing the page. If the invoice status does not update within 5 minutes, please contact support and provide the Razorpay Payment ID from your receipt.'
  },
  {
    id: 'faq-4',
    category: 'projects',
    question: 'How do I submit feedback on a project milestone?',
    answer: 'To submit feedback, go to the Projects page, click on the relevant project card, and navigate to the "Feedback" tab. You can leave notes, request adjustments, or leave positive feedback for the team. The development team is notified immediately when you post feedback.'
  },
  {
    id: 'faq-5',
    category: 'projects',
    question: 'Where can I see the status of active deliverables?',
    answer: 'All active deliverables are tracked in the Project Details view. In the "Overview" and "Milestones" sections of your project, you will find progress status badges (e.g., In Progress, Under Review, Completed) and estimated completion dates.'
  },
  {
    id: 'faq-6',
    category: 'account',
    question: 'How do I update my profile picture or display name?',
    answer: 'Go to the Settings page in the sidebar menu. Under the Profile section, you can change your display name and upload a new avatar image. Click "Save Changes" to update your profile immediately.'
  },
  {
    id: 'faq-7',
    category: 'account',
    question: 'How can I reset my account password?',
    answer: 'You can update your password directly from the Settings page. Navigate to the "Security" tab or scroll down to the password section, enter your new desired password, and confirm it. For security reasons, you will receive an email notification confirming the password update.'
  },
  {
    id: 'faq-8',
    category: 'troubleshooting',
    question: 'Why am I seeing a "Load failed" error on the login screen?',
    answer: 'A "Load failed" error is a network-level fetch issue. It usually means your browser is unable to reach the authentication server. Please verify that your internet connection is active, you are not behind a restrictive firewall/VPN, and your browser is not blocking the authentication domain.'
  }
];

export default function HelpCenter() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredFaqs = FAQS.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleStartTour = () => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      toast.error("The product walkthrough is optimized for desktop screens.", {
        description: "Please switch to a desktop device to take the tour."
      });
      return;
    }
    toast.info("Redirecting to Dashboard to start the tour...");
    navigate('/dashboard');
    setTimeout(() => {
      window.dispatchEvent(new Event("start-blukaze-tour"));
    }, 500);
  };

  const categories = [
    { id: 'all', name: 'All Topics', icon: HelpCircle },
    { id: 'general', name: 'General', icon: BookOpen },
    { id: 'billing', name: 'Billing & Payments', icon: CreditCard },
    { id: 'projects', name: 'Projects & Revisions', icon: FolderKanban },
    { id: 'account', name: 'Account & Security', icon: User },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: AlertTriangle },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto py-4">
        {/* Header */}
        <div className="text-center space-y-3 py-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Help & Support Center
          </h1>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Find answers to frequently asked questions, learn how to navigate your dashboard, or restart the interactive walkthrough.
          </p>
        </div>

        {/* Quick Tour Card */}
        <div className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-blue-950/20 p-6 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-lg font-bold text-blue-100 flex items-center justify-center md:justify-start gap-2">
              <Play className="w-5 h-5 text-blue-400 fill-blue-400/30" />
              Need a quick refresher?
            </h2>
            <p className="text-sm text-blue-200/70 max-w-md">
              Relaunch the interactive walkthrough to guide you through the projects navigation, dashboard overview cards, and key settings.
            </p>
          </div>
          <Button 
            onClick={handleStartTour}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            Launch Product Tour
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search help articles (e.g. payment, password, revisions...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-muted/30 border-muted-foreground/10 focus-visible:ring-indigo-500/50"
          />
        </div>

        {/* Categories Tab Grid */}
        <div className="flex overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-nowrap md:flex-wrap gap-2 justify-start md:justify-center border-b border-border pb-4 -mx-4 px-4 md:mx-0 md:px-0 whitespace-nowrap">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2 border-b border-border/40 pb-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Frequently Asked Questions
          </h2>

          {filteredFaqs.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-3">
              {filteredFaqs.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="border border-muted-foreground/10 rounded-lg px-4 py-1 bg-muted/10 hover:bg-muted/20 transition-colors"
                >
                  <AccordionTrigger className="hover:no-underline font-medium text-left text-sm sm:text-base py-3">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed border-t border-border/40 pt-3 pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-12 border border-dashed border-border rounded-xl bg-muted/5">
              <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-foreground">No matches found</p>
              <p className="text-muted-foreground text-sm mt-1">
                We couldn't find any FAQs matching "{searchQuery}". Try a different term or contact support.
              </p>
            </div>
          )}
        </div>

        {/* Contact Support Section */}
        <div className="rounded-xl border border-border bg-muted/20 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-lg font-bold text-foreground flex items-center justify-center md:justify-start gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Still need assistance?
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              If you couldn't find the answer you were looking for, please email us directly. We're happy to help!
            </p>
          </div>
          <a
            href="mailto:support@blukaze.com"
            className="w-full md:w-auto inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-border/60 bg-transparent shadow-sm hover:bg-muted hover:text-foreground h-9 px-4 py-2 text-primary hover:no-underline"
          >
            support@blukaze.com
          </a>
        </div>
      </div>
    </DashboardLayout>
  );
}
