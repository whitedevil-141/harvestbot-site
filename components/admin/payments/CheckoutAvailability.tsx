"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CirclePower, Save, ShieldAlert } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { sessionFetch } from "@/lib/admin-auth";
import { ENDPOINTS } from "@/lib/api";
import { useAdminSession } from "../AdminAuth";
import { Alert, Badge, Button, Panel, Skeleton, Textarea, Toggle, useToast } from "../ui";

const MAX_MESSAGE_LENGTH = 280;

type CheckoutSettings = {
  enabled: boolean;
  maintenance_message: string;
  updated_at: string | null;
};

export function CheckoutAvailability() {
  const { status } = useAdminSession();
  const settings = useAdminResource(
    () => sessionFetch<CheckoutSettings>(ENDPOINTS.checkoutSettings, { cache: "no-store" }),
    [],
    { enabled: status !== "out" },
  );
  const checkoutSettings = settings.data;
  const toast = useToast();
  const [enabled, setEnabled] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!checkoutSettings) return;
    setEnabled(checkoutSettings.enabled);
    setMessage(checkoutSettings.maintenance_message);
  }, [checkoutSettings]);

  const trimmedMessage = message.trim();
  const messageError = useMemo(() => {
    if (!trimmedMessage) return "Enter a maintenance message.";
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return `Keep the message to ${MAX_MESSAGE_LENGTH} characters or fewer.`;
    }
    return null;
  }, [trimmedMessage]);

  const dirty = Boolean(
    checkoutSettings &&
      (enabled !== checkoutSettings.enabled || trimmedMessage !== checkoutSettings.maintenance_message),
  );

  const save = async () => {
    if (!checkoutSettings || messageError || !dirty) return;
    if (checkoutSettings.enabled && !enabled) {
      const confirmed = window.confirm(
        "Disable checkout now? Customers will see the maintenance notice and new payment verifications will be blocked.",
      );
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      const saved = await sessionFetch<CheckoutSettings>(ENDPOINTS.checkoutSettings, {
        method: "PUT",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, maintenance_message: trimmedMessage }),
      });
      settings.setData(saved);
      setMessage(trimmedMessage);
      toast.success(enabled ? "Checkout is live." : "Checkout maintenance mode is active.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update checkout settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <CirclePower className="h-4 w-4 text-adm-accent" /> Checkout availability
        </span>
      }
      description="Control the customer checkout without rebuilding or redeploying the site."
      actions={
        checkoutSettings && (
          <Badge tone={checkoutSettings.enabled ? "good" : "warn"}>
            {checkoutSettings.enabled ? "Live" : "Maintenance"}
          </Badge>
        )
      }
    >
      {settings.error ? (
        <Alert onRetry={settings.refresh}>{settings.error}</Alert>
      ) : settings.loading && !checkoutSettings ? (
        <div className="space-y-4" aria-label="Loading checkout settings">
          <Skeleton className="h-16" />
          <Skeleton className="h-24" />
        </div>
      ) : checkoutSettings ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-3">
            <Toggle
              checked={enabled}
              onChange={setEnabled}
              disabled={saving}
              label={enabled ? "Checkout enabled" : "Checkout disabled"}
              hint={enabled ? "Customers can complete new purchases." : "New checkout activity is blocked."}
            />
            {!enabled && (
              <div className="flex items-start gap-2 rounded-xl border border-adm-warn/25 bg-adm-warn-dim px-3 py-2.5 text-xs leading-relaxed text-adm-warn">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                Saving this state replaces the payment page and blocks verification and conversion requests.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Textarea
              label="Maintenance message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={saving}
              rows={3}
              maxLength={MAX_MESSAGE_LENGTH + 1}
              mono={false}
              error={messageError}
              hint={`${trimmedMessage.length}/${MAX_MESSAGE_LENGTH} characters. Shown only while checkout is disabled.`}
            />
            <div className="flex justify-end">
              <Button
                variant="primary"
                loading={saving}
                disabled={!dirty || Boolean(messageError)}
                onClick={() => void save()}
              >
                <Save className="h-3.5 w-3.5" /> Save changes
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
