import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import { Plus, CreditCard, Receipt, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
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
    const [razorpayLoaded, setRazorpayLoaded] = useState(false);

    // Form State
    const [newTitle, setNewTitle] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newCurrency, setNewCurrency] = useState('USD');
    const [newDueDate, setNewDueDate] = useState('');

    const fetchInvoices = async () => {
        try {
            const { data, error } = await supabase
                .from('invoices' as any)
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInvoices((data as any) || []);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            // toast.error('Failed to load invoices');
        } finally {
            setLoading(false);
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
                name: 'Blunicorn',
                description: invoice.title,
                handler: (response: any) => {
                    // Payment initiated successfully
                    toast.success('Payment initiated! Confirming...');
                    // Refresh invoice status after a delay (webhook will update it)
                    setTimeout(() => {
                        fetchInvoices();
                        setPayingInvoiceId(null);
                    }, 3000);
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
                .update({ status: 'paid' })
                .eq('id', invoiceId);

            if (error) throw error;
            toast.success('Marked as paid');
            fetchInvoices();
        } catch (error) {
            toast.error('Update failed');
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
                <h3 className="text-lg font-semibold text-foreground">Invoices & Payments</h3>
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
                                            <Badge variant={invoice.status === 'paid' ? 'secondary' : 'default'} className={
                                                invoice.status === 'paid' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' :
                                                    invoice.status === 'overdue' ? 'destructive' : 'default'
                                            }>
                                                {invoice.status}
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
        </div >
    );
};

export default BillingSection;
