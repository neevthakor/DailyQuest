import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const ADMIN_USER_ID = 'b3b8976d-82e1-43b6-bbdf-00d7b8c82f7e';

export default function AdminPayments() {
  const auth = useAuth();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isAdmin =
    auth.isAuthenticated &&
    auth.user?.id === ADMIN_USER_ID;

  const loadPayments = async () => {
    if (!isAdmin || !supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('payment_requests')
        .select(`
          id,
          user_id,
          plan,
          amount,
          utr,
          status,
          created_at,
          reviewed_at,
          reviewed_by
        `)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setPayments(data || []);
    } catch (err) {
      console.error('Admin payments error:', err);
      setError(
        err?.message || 'Could not load payment requests.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [isAdmin]);

  const approvePayment = async (paymentId) => {
    setProcessingId(paymentId);
    setError('');
    setMessage('');

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'approve_payment_request',
        {
          p_payment_request_id: paymentId,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      if (!data?.success) {
        throw new Error(
          data?.reason || 'Payment approval failed.'
        );
      }

      setMessage(
        'Payment approved. Premium has been activated.'
      );

      await loadPayments();
    } catch (err) {
      console.error('Approve payment error:', err);
      setError(
        err?.message || 'Could not approve this payment.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const rejectPayment = async (paymentId) => {
    const confirmed = window.confirm(
      'Are you sure you want to reject this payment?'
    );

    if (!confirmed) {
      return;
    }

    setProcessingId(paymentId);
    setError('');
    setMessage('');

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'reject_payment_request',
        {
          p_payment_request_id: paymentId,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      if (!data?.success) {
        throw new Error(
          data?.reason || 'Payment rejection failed.'
        );
      }

      setMessage('Payment rejected.');

      await loadPayments();
    } catch (err) {
      console.error('Reject payment error:', err);
      setError(
        err?.message || 'Could not reject this payment.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div>
        <div className="page-title">
          Access Denied
        </div>

        <div className="card">
          <div className="profile-help">
            You do not have permission to access this page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">
        Admin Payments
      </div>

      <div className="page-subtitle">
        Review UPI Premium payments
      </div>

      {error && (
        <div className="form-error mb-16">
          {error}
        </div>
      )}

      {message && (
        <div
          className="card mb-16"
          style={{
            borderColor: 'var(--accent)',
          }}
        >
          <div
            style={{
              color: 'var(--accent)',
              fontWeight: '600',
            }}
          >
            {message}
          </div>
        </div>
      )}

      {loading ? (
        <div className="card text-center">
          <div className="page-subtitle">
            Loading payment requests...
          </div>
        </div>
      ) : payments.length === 0 ? (
        <div className="card text-center">
          <div className="section-title mb-16">
            No payment requests
          </div>

          <div className="profile-help">
            New UPI payment requests will appear here.
          </div>
        </div>
      ) : (
        <div>
          {payments.map((payment) => {
            const isProcessing =
              processingId === payment.id;

            return (
              <div
                key={payment.id}
                className="card mb-16"
              >
                <div className="section-title mb-16">
                  ₹{payment.amount} —{' '}
                  {payment.plan === 'monthly'
                    ? 'Monthly'
                    : 'Yearly'}
                </div>

                <div className="profile-help">
                  <strong>User ID:</strong>{' '}
                  {payment.user_id}
                </div>

                <div
                  className="profile-help"
                  style={{ marginTop: '8px' }}
                >
                  <strong>UTR:</strong>{' '}
                  {payment.utr}
                </div>

                <div
                  className="profile-help"
                  style={{ marginTop: '8px' }}
                >
                  <strong>Submitted:</strong>{' '}
                  {new Date(
                    payment.created_at
                  ).toLocaleString()}
                </div>

                <div
                  style={{
                    marginTop: '12px',
                    fontWeight: '600',
                  }}
                >
                  Status:{' '}
                  <span
                    style={{
                      textTransform: 'capitalize',
                    }}
                  >
                    {payment.status}
                  </span>
                </div>

                {payment.status === 'pending' && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      marginTop: '16px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      className="btn btn-accent"
                      onClick={() =>
                        approvePayment(payment.id)
                      }
                      disabled={isProcessing}
                    >
                      {isProcessing
                        ? 'Processing...'
                        : 'Approve'}
                    </button>

                    <button
                      className="btn btn-danger"
                      onClick={() =>
                        rejectPayment(payment.id)
                      }
                      disabled={isProcessing}
                    >
                      {isProcessing
                        ? 'Processing...'
                        : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        className="btn btn-secondary btn-full"
        onClick={loadPayments}
        disabled={loading}
      >
        Refresh Payments
      </button>
    </div>
  );
}