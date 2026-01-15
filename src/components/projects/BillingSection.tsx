import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, CreditCard, Receipt, Loader2, CheckCircle2, Trash2, Eye, Info, Calendar, Hash, RefreshCw } from 'lucide-react';


import { format } from 'date-fns';
import { toast } from 'sonner';

interface Invoice {
    id: string;
    title: string;
    amount: number;
    currency: string;
    status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    paid_at?: string;
    due_date?: string;
    created_at: string;
}

const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];

const BillingSection = () => {
    const { id: projectId } = useParams<{ id: string }>();
    const { user, role } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [razorpayLoaded, setRazorpayLoaded] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);



    // Form State
    const [newTitle, setNewTitle] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newCurrency, setNewCurrency] = useState('USD');
    const [newDueDate, setNewDueDate] = useState('');

    const fetchInvoices = async (showToast = false) => {
        if (!projectId) {
            console.error('No project ID found in params');
            return;
        }

        try {
            if (showToast) setIsRefreshing(true);
            const { data, error } = await supabase
                .from('invoices' as any)
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            console.log(`Fetched ${data?.length || 0} invoices for project ${projectId}:`, data);
            setInvoices((data as any) || []);
            if (showToast) toast.success('Invoices updated');
        } catch (error) {
            console.error('Error fetching invoices:', error);
            if (showToast) toast.error('Failed to update invoices');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };


    // Load Razorpay Checkout script
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => setRazorpayLoaded(true);
        script.onerror = () => {
            console.error('Failed to load Razorpay SDK');
            toast.error('Payment gateway failed to load');
        };
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    useEffect(() => {
        if (projectId) {
            fetchInvoices();
        }
    }, [projectId]);

    const handleCreateInvoice = async () => {
        if (!newTitle || !newAmount) {
            toast.error('Title and Amount are required');
            return;
        }

        setIsCreating(true);
        try {
            const { error } = await supabase
                .from('invoices' as any)
                .insert({
                    project_id: projectId,
                    title: newTitle,
                    amount: parseFloat(newAmount),
                    currency: newCurrency,
                    due_date: newDueDate ? new Date(newDueDate).toISOString() : null,
                    status: 'pending'
                });

            if (error) throw error;

            toast.success('Invoice created successfully');
            setCreateOpen(false);
            setNewTitle('');
            setNewAmount('');
            setNewCurrency('USD');
            setNewDueDate('');
            fetchInvoices();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create invoice');
        } finally {
            setIsCreating(false);
        }
    };

    const handlePayNow = async (invoice: Invoice) => {
        if (!razorpayLoaded) {
            toast.error('Payment gateway is still loading. Please try again.');
            return;
        }

        const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!razorpayKeyId) {
            toast.error('Payment gateway not configured');
            return;
        }

        setPayingInvoiceId(invoice.id);

        try {
            // Call Edge Function to create Razorpay order
            const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
                body: { invoice_id: invoice.id }
            });

            if (error) throw error;

            // Launch Razorpay Checkout
            const options = {
                key: razorpayKeyId,
                order_id: data.order_id,
                amount: data.amount,
                currency: data.currency,
                name: 'Blukaze',
                description: invoice.title,
                handler: async (response: any) => {
                    console.log('Razorpay payment response:', response);
                    toast.loading('Verifying payment...', { id: 'payment-verification' });

                    try {
                        const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
                            body: {
                                order_id: response.razorpay_order_id,
                                payment_id: response.razorpay_payment_id,
                                signature: response.razorpay_signature
                            }
                        });

                        if (error) throw error;

                        toast.dismiss('payment-verification');
                        toast.success('Payment verified successfully!');

                        // Immediate refresh since we know it's updated
                        fetchInvoices();
                        setPayingInvoiceId(null);

                    } catch (error: any) {
                        console.error('Verification error:', error);
                        toast.dismiss('payment-verification');
                        toast.error('Payment verified but status update failed. Please contact support.');

                        // Fallback to polling just in case webhook worked
                        fetchInvoices();
                        setPayingInvoiceId(null);
                    }
                },

                modal: {
                    ondismiss: () => {
                        toast.info('Payment cancelled');
                        setPayingInvoiceId(null);
                    }
                },
                theme: {
                    color: '#6366f1'
                }
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();

        } catch (error: any) {
            console.error('Payment error:', error);
            toast.error(error.message || 'Failed to initiate payment');
            setPayingInvoiceId(null);
        }
    };

    const handleMarkAsPaid = async (invoiceId: string) => {
        try {
            const { error } = await supabase
                .from('invoices' as any)
                .update({
                    status: 'paid',
                    paid_at: new Date().toISOString()
                })
                .eq('id', invoiceId);

            if (error) throw error;
            toast.success('Invoice marked as paid');
            fetchInvoices();
        } catch (error) {
            console.error('Update error:', error);
            toast.error('Failed to update status');
        }
    };


    const handleDeleteInvoice = (invoiceId: string) => {
        setDeleteId(invoiceId);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        try {
            const { error } = await supabase
                .from('invoices' as any)
                .delete()
                .eq('id', deleteId);

            if (error) throw error;
            toast.success('Invoice deleted');
            fetchInvoices();
        } catch (error) {
            toast.error('Delete failed');
        } finally {
            setDeleteId(null);
        }
    };

    if (loading) {
        return <div className="py-8 text-center text-muted-foreground">Loading billing details...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-foreground">Invoices & Payments</h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => fetchInvoices(true)}
                        disabled={isRefreshing || loading}
                    >
                        <RefreshCw className={cn("w-4 h-4", (isRefreshing || loading) && "animate-spin")} />
                    </Button>
                </div>
                {role === 'admin' && (

                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Create Invoice
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>New Invoice</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input
                                        placeholder="e.g. Milestone 1 Payment"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Amount</Label>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={newAmount}
                                            onChange={(e) => setNewAmount(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Currency</Label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={newCurrency}
                                            onChange={(e) => setNewCurrency(e.target.value)}
                                        >
                                            {currencies.map(c => (
                                                <option key={c.code} value={c.code}>
                                                    {c.code} ({c.symbol})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Due Date</Label>
                                    <Input
                                        type="date"
                                        value={newDueDate}
                                        onChange={(e) => setNewDueDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreateInvoice} disabled={isCreating}>
                                    {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Create Invoice
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {
                invoices.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg border-dashed">
                        <Receipt className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No invoices generated yet.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {invoices.map((invoice) => (
                            <Card key={invoice.id} className="glass-card">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-base font-medium leading-none">
                                            {invoice.title}
                                        </CardTitle>
                                        <div className="flex gap-2">
                                            <Badge variant="outline" className={cn(
                                                "capitalize font-semibold border-2",
                                                invoice.status === 'paid' && "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20",
                                                invoice.status === 'pending' && "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20",
                                                invoice.status === 'overdue' && "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20",
                                                invoice.status === 'cancelled' && "bg-slate-500/10 text-slate-500 border-slate-500/20 hover:bg-slate-500/20",
                                                (!invoice.status || invoice.status === 'draft') && "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20"
                                            )}>
                                                {invoice.status || 'draft'}
                                            </Badge>
                                            {role === 'admin' && (

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleDeleteInvoice(invoice.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <CardDescription className="text-xs">
                                        {invoice.created_at && format(new Date(invoice.created_at), 'MMM d, yyyy')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold mb-4">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency || 'USD' }).format(invoice.amount)}
                                    </div>

                                    <div className="space-y-3">
                                        {invoice.due_date && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Due Date</span>
                                                <span>{format(new Date(invoice.due_date), 'MMM d, yyyy')}</span>
                                            </div>
                                        )}

                                        {invoice.paid_at && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Paid On</span>
                                                <span className="text-green-600">{format(new Date(invoice.paid_at), 'MMM d, yyyy')}</span>
                                            </div>
                                        )}

                                        {invoice.status === 'pending' && (
                                            <Button
                                                className="w-full"
                                                onClick={() => handlePayNow(invoice)}
                                                disabled={payingInvoiceId === invoice.id}
                                            >
                                                {payingInvoiceId === invoice.id ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Processing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CreditCard className="w-4 h-4 mr-2" />
                                                        Pay Now
                                                    </>
                                                )}
                                            </Button>
                                        )}

                                        {invoice.status === 'paid' && (
                                            <Button
                                                variant="outline"
                                                className="w-full border-green-500/20 hover:border-green-500/50 hover:bg-green-500/5 group"
                                                onClick={() => setSelectedInvoice(invoice)}
                                            >
                                                <Eye className="w-4 h-4 mr-2 text-green-500 group-hover:scale-110 transition-transform" />
                                                View Payment
                                            </Button>
                                        )}


                                        {role === 'admin' && invoice.status !== 'paid' && (
                                            <Button
                                                variant="outline"
                                                className="w-full"
                                                size="sm"
                                                onClick={() => handleMarkAsPaid(invoice.id)}
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                Mark as Paid
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )
            }

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this invoice? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/50 bg-card/95 backdrop-blur-xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Payment Details</DialogTitle>
                    </DialogHeader>
                    {selectedInvoice && (
                        <div className="flex flex-col h-full">
                            {/* Header Section */}
                            <div className="relative bg-gradient-to-br from-emerald-500/20 via-primary/10 to-transparent pt-10 pb-8 px-6 text-center border-b border-border/50">

                                <div className="relative inline-flex mb-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-in zoom-in duration-300">
                                        <CheckCircle2 className="w-8 h-8 text-white stroke-[2.5]" />
                                    </div>
                                    <div className="absolute -inset-1 rounded-full border border-emerald-500/30 animate-pulse" />
                                </div>

                                <h4 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-emerald-600">
                                    Payment Successful
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1 max-w-[80%] mx-auto font-medium">
                                    {selectedInvoice.title}
                                </p>
                            </div>

                            {/* Amount Section */}
                            <div className="py-6 px-6 text-center bg-card/50">
                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Amount Paid</span>
                                <div className="mt-2 text-4xl font-bold tracking-tight text-foreground tabular-nums">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedInvoice.currency || 'USD' }).format(selectedInvoice.amount)}
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="px-6 pb-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
                                        <span className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
                                            <Calendar className="w-3 h-3" /> Paid On
                                        </span>
                                        <div className="font-semibold text-foreground">
                                            {selectedInvoice.paid_at ? format(new Date(selectedInvoice.paid_at), 'MMM d, yyyy') : '-'}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {selectedInvoice.paid_at ? format(new Date(selectedInvoice.paid_at), 'h:mm a') : ''}
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
                                        <span className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
                                            <CreditCard className="w-3 h-3" /> Method
                                        </span>
                                        <div className="font-semibold text-foreground">Razorpay</div>
                                        <div className="text-xs text-muted-foreground">Secured Payment</div>
                                    </div>
                                </div>

                                {/* Transaction IDs */}
                                <div className="space-y-3 pt-2">
                                    {selectedInvoice.razorpay_payment_id && (
                                        <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <span className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
                                                <Hash className="w-3 h-3" /> Payment ID
                                            </span>
                                            <code className="text-[11px] font-mono select-all text-foreground/80 break-all">
                                                {selectedInvoice.razorpay_payment_id}
                                            </code>
                                        </div>
                                    )}

                                    {selectedInvoice.razorpay_order_id && (
                                        <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <span className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
                                                <Receipt className="w-3 h-3" /> Order ID
                                            </span>
                                            <code className="text-[11px] font-mono select-all text-foreground/80 break-all">
                                                {selectedInvoice.razorpay_order_id}
                                            </code>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="px-6 pb-6 pt-2">
                                <Button
                                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 transform hover:scale-[1.02]"
                                    onClick={() => setSelectedInvoice(null)}
                                >
                                    Done
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </div >
    );
};

export default BillingSection;
