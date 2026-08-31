import { useState } from 'react';
import AdPlaceholder from '../components/AdPlaceholder';
import {
  PREMIUM_BENEFITS,
  PREMIUM_PLANS,
} from '../services/premiumService';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

import upiQr79 from '../assets/upi-79.png';
import upiQr499 from '../assets/upi-499.png';

export default function Premium() {
  const auth = useAuth();

  const [selected, setSelected] = useState('monthly');
  const [utr, setUtr] = useState('');
  const [screenshot, setScreenshot] = useState(null);

  const [showPayment, setShowPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedPlan =
    PREMIUM_PLANS.find((plan) => plan.id === selected) ||
    PREMIUM_PLANS[0];

  const amount = selected === 'monthly' ? 79 : 499;

  const qrImage =
    selected === 'monthly'
      ? upiQr79
      : upiQr499;

  const handleUpgrade = () => {
    setError('');
    setMessage('');

    if (!auth.isAuthenticated || !auth.user) {
      setError('Please sign in before purchasing Premium.');
      return;
    }

    setShowPayment(true);
  };

  const handleScreenshotChange = (event) => {
    const file = event.target.files?.[0];

    setError('');

    if (!file) {
      setScreenshot(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Screenshot must be smaller than 5 MB.');
      event.target.value = '';
      return;
    }

    setScreenshot(file);
  };

  const handleSubmitPayment = async (event) => {
    event.preventDefault();

    setError('');
    setMessage('');

    const cleanUtr = utr.trim();

    if (!auth.user?.id) {
      setError(
        'Your account session has expired. Please sign in again.'
      );
      return;
    }

    if (!cleanUtr) {
      setError(
        'Please enter your UTR / transaction ID.'
      );
      return;
    }

    if (cleanUtr.length < 6) {
      setError(
        'Please enter a valid UTR / transaction ID.'
      );
      return;
    }

    if (!screenshot) {
      setError(
        'Please upload a screenshot of your successful payment.'
      );
      return;
    }

    if (!supabase) {
      setError(
        'Payment service is not configured.'
      );
      return;
    }

    setSubmitting(true);

    let uploadedPath = null;

    try {
      /*
       * Store screenshots inside the user's own folder.
       *
       * Example:
       * payment-screenshots/
       *   USER_ID/
       *     1725123456789-abc123.png
       */
      const fileExtension =
        screenshot.name.split('.').pop()?.toLowerCase() || 'png';

      const safeExtension =
        /^[a-z0-9]+$/.test(fileExtension)
          ? fileExtension
          : 'png';

      const fileName =
        `${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

      uploadedPath =
        `${auth.user.id}/${fileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from('payment-screenshots')
          .upload(uploadedPath, screenshot, {
            cacheControl: '3600',
            upsert: false,
            contentType: screenshot.type,
          });

      if (uploadError) {
        throw uploadError;
      }

      const { error: insertError } =
        await supabase
          .from('payment_requests')
          .insert({
            user_id: auth.user.id,
            plan: selected,
            amount,
            utr: cleanUtr,
            screenshot_path: uploadedPath,
            status: 'pending',
          });

      if (insertError) {
        /*
         * If the database insert fails after the screenshot
         * was uploaded, remove the orphaned screenshot.
         */
        await supabase.storage
          .from('payment-screenshots')
          .remove([uploadedPath]);

        uploadedPath = null;

        throw insertError;
      }

      setMessage(
        'Payment request submitted successfully. We will verify your payment and activate Premium.'
      );

      setUtr('');
      setScreenshot(null);
      setShowPayment(false);

      const fileInput =
        document.getElementById('payment-screenshot');

      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err) {
      console.error(
        'Payment request error:',
        err
      );

      if (err?.code === '23505') {
        setError(
          'This UTR has already been submitted.'
        );
      } else {
        setError(
          err?.message ||
            'Could not submit payment request. Please try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (submitting) return;

    setShowPayment(false);
    setError('');
    setUtr('');
    setScreenshot(null);
  };

  const handlePlanChange = (planId) => {
    setSelected(planId);
    setShowPayment(false);
    setMessage('');
    setError('');
    setUtr('');
    setScreenshot(null);
  };

  return (
    <div>
      <div className="page-title">
        DailyQuest Pro
      </div>

      <div className="page-subtitle">
        Unlock the full experience
      </div>

      <div className="premium-hero">
        <div className="premium-badge">
          DAILYQUEST PRO
        </div>

        <div className="duel-sub">
          Level up your daily adventure
        </div>
      </div>

      {/* PLANS */}
      <div className="premium-price">
        {PREMIUM_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`price-card ${
              selected === plan.id
                ? 'selected'
                : ''
            }`}
            onClick={() =>
              handlePlanChange(plan.id)
            }
          >
            <div className="price-amount">
              {plan.amountLabel}
            </div>

            <div className="price-period">
              {plan.period}
            </div>
          </div>
        ))}
      </div>

      {/* BENEFITS */}
      <div className="card mb-16">
        <div className="section-title mb-16">
          Benefits
        </div>

        <ul className="benefit-list">
          {PREMIUM_BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="benefit-item"
            >
              <span className="benefit-check">
                ✓
              </span>

              <span>
                {benefit}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* UPGRADE BUTTON */}
      {!showPayment && (
        <button
          className="btn btn-accent btn-full mb-16"
          onClick={handleUpgrade}
        >
          Upgrade to PRO
        </button>
      )}

      {/* PAYMENT CARD */}
      {showPayment && (
        <div
          className="card mb-16"
          style={{
            borderColor:
              'var(--accent)',
          }}
        >
          <div className="section-title mb-16">
            Pay for DailyQuest Pro
          </div>

          <div className="profile-help mb-16">
            Selected plan:{' '}
            <strong>
              {selectedPlan.amountLabel}
            </strong>{' '}
            — {selectedPlan.period}
          </div>

          {/* QR CODE */}
          <div
            style={{
              textAlign: 'center',
              padding: '20px',
              marginBottom: '16px',
              border:
                '1px solid var(--border)',
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                fontSize: '2rem',
                fontWeight: '700',
                marginBottom: '8px',
              }}
            >
              ₹{amount}
            </div>

            <div
              className="duel-sub"
              style={{
                marginBottom: '16px',
              }}
            >
              Scan the QR code to pay
            </div>

            <img
              src={qrImage}
              alt={`UPI payment QR code for ₹${amount}`}
              style={{
                display: 'block',
                width:
                  'min(280px, 100%)',
                height: 'auto',
                margin: '0 auto',
                borderRadius: '12px',
                background: '#fff',
                padding: '12px',
                boxSizing: 'border-box',
              }}
            />

            <div
              className="duel-sub"
              style={{
                marginTop: '14px',
              }}
            >
              Pay exactly ₹{amount}
            </div>
          </div>

          {/* INSTRUCTIONS */}
          <div
            style={{
              padding: '12px',
              marginBottom: '16px',
              background:
                'var(--surface)',
              borderRadius: '10px',
            }}
          >
            <strong>
              Payment steps:
            </strong>

            <ol
              style={{
                marginTop: '10px',
                paddingLeft: '20px',
              }}
            >
              <li>
                Scan the QR code above.
              </li>

              <li>
                Confirm the amount is ₹{amount}.
              </li>

              <li>
                Complete the payment in
                your UPI app.
              </li>

              <li>
                Take a screenshot of the
                successful payment.
              </li>

              <li>
                Copy your UTR / transaction
                ID.
              </li>

              <li>
                Upload the screenshot and
                enter your UTR below.
              </li>

              <li>
                Submit the payment request.
              </li>

              <li>
                Premium will be activated
                after verification.
              </li>
            </ol>
          </div>

          {/* PAYMENT FORM */}
          <form
            onSubmit={
              handleSubmitPayment
            }
          >
            {/* SCREENSHOT */}
            <label
              htmlFor="payment-screenshot"
              className="section-title"
              style={{
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Payment Screenshot
            </label>

            <input
              id="payment-screenshot"
              className="input-field"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={
                handleScreenshotChange
              }
              disabled={submitting}
            />

            {screenshot && (
              <div
                className="duel-sub"
                style={{
                  marginTop: '8px',
                  marginBottom: '12px',
                }}
              >
                Selected:{' '}
                {screenshot.name}
              </div>
            )}

            {/* UTR */}
            <label
              htmlFor="utr"
              className="section-title"
              style={{
                display: 'block',
                marginBottom: '8px',
                marginTop: '16px',
              }}
            >
              UTR / Transaction ID
            </label>

            <input
              id="utr"
              className="input-field"
              type="text"
              value={utr}
              onChange={(event) =>
                setUtr(
                  event.target.value
                )
              }
              placeholder="Enter your UTR / transaction ID"
              maxLength={100}
              autoComplete="off"
              disabled={submitting}
            />

            {/* SUBMIT */}
            <button
              type="submit"
              className="btn btn-accent btn-full"
              disabled={submitting}
              style={{
                marginTop: '12px',
              }}
            >
              {submitting
                ? 'Submitting...'
                : 'I Have Paid — Submit'}
            </button>

            {/* CANCEL */}
            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={handleCancel}
              disabled={submitting}
              style={{
                marginTop: '10px',
              }}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="form-error mb-16">
          {error}
        </div>
      )}

      {/* SUCCESS */}
      {message && (
        <div
          className="card text-center mb-16"
          style={{
            borderColor:
              'var(--accent)',
          }}
        >
          <div
            style={{
              color:
                'var(--accent)',
              fontWeight: '600',
              marginBottom: '6px',
            }}
          >
            Payment Submitted
          </div>

          <div className="duel-sub">
            {message}
          </div>
        </div>
      )}

      <AdPlaceholder label="Sponsored" />
    </div>
  );
}