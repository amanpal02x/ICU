import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, Clock, MapPin, MessageSquare, Send, CheckCircle, AlertCircle, Users, Shield, Settings, Headphones } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";

// Formspree configuration - replace with your actual Formspree form ID
const FORMSPREE_FORM_ID = "meovvzyw"; // TODO: Replace with your actual form ID from formspree.io

const Support = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: '',
    priority: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('priority', formData.priority);
      formDataToSend.append('message', formData.message);

      const response = await fetch(`https://formspree.io/f/${FORMSPREE_FORM_ID}`, {
        method: 'POST',
        body: formDataToSend,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        setSubmitStatus('success');
        toast({
          title: "Message Sent!",
          description: "Thank you for contacting us. We've received your message and will respond within 24 hours.",
        });
        setFormData({
          name: '',
          email: '',
          subject: '',
          category: '',
          priority: '',
          message: ''
        });
      } else {
        setSubmitStatus('error');
        toast({
          title: "Error Sending Message",
          description: "There was a problem sending your message. Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setSubmitStatus('error');
      toast({
        title: "Error Sending Message",
        description: "There was a problem sending your message. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const supportFeatures = [
    {
      icon: <Headphones className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
      title: "24/7 Support",
      description: "Round-the-clock technical support for critical ICU monitoring systems."
    },
    {
      icon: <Settings className="h-5 w-5 text-slate-600 dark:text-slate-400" />,
      title: "System Maintenance",
      description: "Regular maintenance and updates to ensure optimal system performance."
    },
    {
      icon: <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
      title: "Security & Compliance",
      description: "HIPAA compliant support with enterprise-grade security measures."
    },
    {
      icon: <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />,
      title: "Training & Onboarding",
      description: "Comprehensive training programs for healthcare staff and administrators."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800">
      <Header />
      <div className="container mx-auto px-4 py-16 pt-24">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Help & Support Center
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Get the assistance you need for ICU Alarm Center. Our expert team is here to help you 24/7.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto items-stretch">
          {/* Contact Form */}
          <Card className="shadow-xl border-0 min-h-[600px]">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-xl">
                <MessageSquare className="h-5 w-5" />
                Contact Us
              </CardTitle>
              <CardDescription className="text-blue-100">
                Fill out the form below and we'll get back to you within 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4" action={`https://formspree.io/f/${FORMSPREE_FORM_ID}`} method="POST">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    placeholder="Brief description of your inquiry"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical Support</SelectItem>
                        <SelectItem value="billing">Billing & Licensing</SelectItem>
                        <SelectItem value="training">Training & Documentation</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="bug">Bug Report</SelectItem>
                        <SelectItem value="general">General Inquiry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select onValueChange={(value) => handleInputChange('priority', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder="Please provide detailed information about your inquiry..."
                    rows={6}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !FORMSPREE_FORM_ID || FORMSPREE_FORM_ID === 'your-formspree-form-id'}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
                {(!FORMSPREE_FORM_ID || FORMSPREE_FORM_ID === 'your-formspree-form-id') && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                    ⚠️ Please configure your Formspree form ID in the code to enable form submissions.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Information and Support Resources */}
          <div className="space-y-6">
            {/* All-in-One Support Card */}
            <Card className="shadow-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 min-h-[600px]">
              <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 text-white">
                <CardTitle className="flex items-center justify-between text-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Support Overview
                  </div>
                  {/* Quick Stats in header */}
                  <div className="hidden sm:flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-lg">24/7</div>
                      <div className="opacity-90">Support</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg">{"< 4hrs"}</div>
                      <div className="opacity-90">Response</div>
                    </div>
                  </div>
                </CardTitle>
                <CardDescription className="text-slate-200">
                  Everything you need to get help with ICU Alarm Center
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Mobile Quick Stats */}
                <div className="sm:hidden">
                  <div className="grid grid-cols-2 gap-4 text-center mb-6">
                    <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">24/7</div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">Support Available</div>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{"< 4hrs"}</div>
                      <div className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Response Time</div>
                    </div>
                  </div>
                </div>

                {/* Services Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Settings className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    Our Services
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {supportFeatures.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-blue-100 dark:border-blue-800">
                        <div className="flex-shrink-0">{feature.icon}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">{feature.title}</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight mt-0.5 line-clamp-2">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact Methods */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    Contact Methods
                  </h3>
                  <div className="space-y-3">
                    

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-slate-200 dark:border-slate-700">
                      <Mail className="h-4 w-4 text-slate-600 dark:text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-gray-900 dark:text-white">Email Support</span>
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">4hrs</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 font-mono break-all">contact@logicboots.com</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-slate-200 dark:border-slate-700">
                      <Clock className="h-4 w-4 text-slate-600 dark:text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-gray-900 dark:text-white">Business Hours</span>
                          <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">M-F</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Mon - Fri: 9 AM - 6 PM IST</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;

// Instructions for setting up Formspree:
// 1. Go to https://formspree.io and create a free account
// 2. Create a new form and copy the form ID (looks like: xxxxxx)
// 3. Replace 'your-formspree-form-id' with your actual form ID
// 4. The form will send emails to the address you configured in Formspree
