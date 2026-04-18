"use client";

import { useState, useEffect } from "react";

interface Supplier {
  id: string;
  wallet: string;
  name: string;
  licenseNumber: string;
  verifiedBadge: boolean;
}

interface Medicine {
  batchId: string;
  medicineName: string;
  availableQuantity: number;
  expiryDate: string;
  totalQuantity: number;
}

interface OrderFormProps {
  buyerRole: "DISTRIBUTOR" | "PHARMACY";
  supplierRole: "MANUFACTURER" | "DISTRIBUTOR";
  onOrderCreated?: () => void;
}

const QUANTITY_CAPS: Record<string, number> = {
  DISTRIBUTOR: 1000,
  PHARMACY: 200,
};

export function ContextAwareOrderForm({
  buyerRole,
  supplierRole,
  onOrderCreated,
}: OrderFormProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSpecialOrder, setIsSpecialOrder] = useState(false);

  // Load suppliers
  useEffect(() => {
    async function loadSuppliers() {
      try {
        const res = await fetch(`/api/suppliers?role=${supplierRole}`);
        if (res.ok) {
          const data = await res.json();
          setSuppliers(data.suppliers || []);
        }
      } catch (err) {
        console.error("Failed to load suppliers:", err);
      }
    }
    loadSuppliers();
  }, [supplierRole]);

  // Load medicines when supplier changes
  useEffect(() => {
    if (!selectedSupplier) {
      setMedicines([]);
      return;
    }

    async function loadMedicines() {
      setLoadingMedicines(true);
      try {
        const res = await fetch(`/api/suppliers/${selectedSupplier}/medicines`);
        if (res.ok) {
          const data = await res.json();
          setMedicines(data.medicines || []);
        }
      } catch (err) {
        console.error("Failed to load medicines:", err);
      } finally {
        setLoadingMedicines(false);
      }
    }
    loadMedicines();
  }, [selectedSupplier]);

  // Check if quantity exceeds available stock or cap
  useEffect(() => {
    const medicine = medicines.find((m) => m.batchId === selectedMedicine);
    const cap = QUANTITY_CAPS[buyerRole] || 200;
    setIsSpecialOrder(
      quantity > cap || (medicine ? quantity > medicine.availableQuantity : false)
    );
  }, [quantity, selectedMedicine, medicines, buyerRole]);

  const selectedMedicineData = medicines.find(
    (m) => m.batchId === selectedMedicine
  );
  const quantityCap = QUANTITY_CAPS[buyerRole] || 200;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSupplier || !selectedMedicine || quantity < 1) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplier,
          batchId: selectedMedicine,
          quantity,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create order");
      }

      const data = await res.json();
      setSuccess(
        `Order created successfully!${data.order.isSpecialOrder ? " (Special order - requires approval)" : ""}`
      );
      setSelectedMedicine("");
      setQuantity(1);
      onOrderCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-zinc-100">Place Order</h3>
        <p className="text-xs text-zinc-400">
          Select a supplier and medicine to order. Max {quantityCap} units per
          standard order.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Supplier Selection */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-300">
            Select {supplierRole.toLowerCase()}
          </label>
          <select
            value={selectedSupplier}
            onChange={(e) => {
              setSelectedSupplier(e.target.value);
              setSelectedMedicine("");
            }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          >
            <option value="">Choose a supplier...</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
                {supplier.verifiedBadge ? " (Verified)" : ""} - {supplier.wallet?.slice(0, 8)}...
              </option>
            ))}
          </select>
          {suppliers.length === 0 && (
            <p className="mt-1 text-xs text-zinc-500">
              No {supplierRole.toLowerCase()}s available
            </p>
          )}
        </div>

        {/* Medicine Selection */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-300">
            Select medicine
          </label>
          <select
            value={selectedMedicine}
            onChange={(e) => setSelectedMedicine(e.target.value)}
            disabled={!selectedSupplier || loadingMedicines}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none disabled:opacity-50"
          >
            <option value="">
              {loadingMedicines
                ? "Loading..."
                : selectedSupplier
                  ? "Choose a medicine..."
                  : "Select supplier first"}
            </option>
            {medicines.map((medicine) => (
              <option key={medicine.batchId} value={medicine.batchId}>
                {medicine.medicineName} - {medicine.availableQuantity} available
                (Exp: {medicine.expiryDate})
              </option>
            ))}
          </select>
          {selectedSupplier && medicines.length === 0 && !loadingMedicines && (
            <p className="mt-1 text-xs text-zinc-500">
              No medicines available from this supplier
            </p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-300">
            Quantity
          </label>
          <input
            type="number"
            min={1}
            max={10000}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          />
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-zinc-500">Max standard order: {quantityCap}</span>
            {selectedMedicineData && (
              <span className="text-zinc-500">
                Available: {selectedMedicineData.availableQuantity}
              </span>
            )}
          </div>
        </div>

        {/* Special Order Warning */}
        {isSpecialOrder && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="flex items-start gap-2">
              <svg
                className="mt-0.5 h-4 w-4 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-400">
                  Special Order
                </p>
                <p className="text-xs text-amber-300/80">
                  This order exceeds the standard limit or available stock. It
                  will be flagged for special review by the supplier.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">
            {success}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !selectedSupplier || !selectedMedicine || quantity < 1}
          className="w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:opacity-50"
        >
          {loading
            ? "Creating order..."
            : isSpecialOrder
              ? "Place Special Order"
              : "Place Order"}
        </button>
      </form>
    </div>
  );
}
