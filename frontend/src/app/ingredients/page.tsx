"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import { API_URL } from "@/lib/config";

type Ingredient = {
    id: number;
    name: string;
    price: number;
    amount: number;
    unit: string;
    updated_at: string;
    tax_type: string;
    tax_rate: number;
};

export default function IngredientsPage() {
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        price: "",
        amount: "",
        unit: "g",
        updated_at: new Date().toISOString().split('T')[0],
        tax_type: "inclusive",
        tax_rate: 8,
    });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        fetchIngredients();
    }, []);

    const fetchIngredients = async () => {
        try {
            const response = await axios.get(`${API_URL}/ingredients/`);
            setIngredients(response.data);
        } catch (error) {
            console.error("Error fetching ingredients:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                price: parseFloat(formData.price),
                amount: parseFloat(formData.amount),
                unit: formData.unit,
                updated_at: formData.updated_at,
                tax_type: formData.tax_type,
                tax_rate: formData.tax_rate, // Send as is (already decimal if retrieved, or need checking) - Wait, in state it is 0.08?
                // In state init: tax_rate: 8. In payload originally: / 100.
                // Let's normalize state to be integer percentage (8), and divide by 100 on submit.
            };

            // Fix: tax_rate in form is integer (8), backend expects decimal (0.08)
            // But wait, my previous code sent `formData.tax_rate / 100`.
            // When loading data back to form, I need to multiply by 100.

            const submitData = {
                ...payload,
                tax_rate: formData.tax_rate / 100
            };

            if (editingId) {
                await axios.put(`${API_URL}/ingredients/${editingId}`, submitData);
            } else {
                await axios.post(`${API_URL}/ingredients/`, submitData);
            }

            fetchIngredients();
            resetForm();
            setIsFormOpen(false);
        } catch (error) {
            console.error("Error saving ingredient:", error);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            price: "",
            amount: "",
            unit: "g",
            updated_at: new Date().toISOString().split('T')[0],
            tax_type: "inclusive",
            tax_rate: 8
        });
        setEditingId(null);
    };

    const handleEdit = (ing: Ingredient) => {
        setEditingId(ing.id);
        setFormData({
            name: ing.name,
            price: ing.price.toString(),
            amount: ing.amount.toString(),
            unit: ing.unit,
            updated_at: ing.updated_at || new Date().toISOString().split('T')[0],
            tax_type: ing.tax_type || 'inclusive',
            tax_rate: (ing.tax_rate || 0.08) * 100, // Convert to percentage
        });
        setIsFormOpen(true);
    };

    return (
        <div className="container min-h-screen pb-24">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>&larr; 戻る</Link>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>材料一覧</h1>
                <div style={{ width: '2rem' }}></div> {/* Spacer */}
            </div>

            {/* Ingredient Cards (Mobile Friendly) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {ingredients.map((ing) => (
                    <div
                        key={ing.id}
                        className="card"
                        style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => handleEdit(ing)}
                    >
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{ing.name}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                {ing.amount}{ing.unit} で ¥{ing.price}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: 'var(--success-color)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                ¥{((ing.tax_type === 'exclusive' ? (ing.price * (1 + (ing.tax_rate || 0.08))) : ing.price) / ing.amount).toFixed(2)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>/{ing.unit}あたり</div>
                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                                更新: {ing.updated_at || '---'} | {ing.tax_type === 'exclusive' ? '税抜' : '税込'}
                            </div>
                        </div>
                    </div>
                ))}
                {ingredients.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        まだ材料がありません。<br />下のボタンから追加してください。
                    </div>
                )}
            </div>

            {/* Floating Action Button */}
            <button
                onClick={() => { resetForm(); setIsFormOpen(true); }}
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    width: '3.5rem',
                    height: '3.5rem',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-color)',
                    color: 'white',
                    border: 'none',
                    boxShadow: 'var(--shadow-lg)',
                    fontSize: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 10
                }}
            >
                +
            </button>

            {/* Slide-up Form Modal */}
            {isFormOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 20,
                    display: 'flex',
                    alignItems: 'flex-end'
                }} onClick={() => { setIsFormOpen(false); resetForm(); }}>
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            backgroundColor: 'white',
                            width: '100%',
                            borderTopLeftRadius: '1.5rem',
                            borderTopRightRadius: '1.5rem',
                            padding: '1.5rem',
                            animation: 'slideUp 0.3s ease-out'
                        }}
                    >
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                            {editingId ? '材料を編集' : '新しい材料を追加'}
                        </h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>材料名</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="例: 強力粉"
                                    className="input-field"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>更新日</label>
                                <input
                                    type="date"
                                    required
                                    className="input-field"
                                    value={formData.updated_at}
                                    onChange={(e) => setFormData({ ...formData, updated_at: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>価格 (円)</label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="例: 300"
                                        className="input-field"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>内容量</label>
                                    <div style={{ display: 'flex' }}>
                                        <input
                                            type="number"
                                            required
                                            placeholder="1000"
                                            className="input-field"
                                            style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        />
                                        <select
                                            className="input-field"
                                            style={{ width: 'auto', borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: 'none', backgroundColor: '#f3f4f6' }}
                                            value={formData.unit}
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        >
                                            <option value="g">g</option>
                                            <option value="ml">ml</option>
                                            <option value="pc">個</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Tax Settings */}
                            <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>税金設定</label>
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                        <input
                                            type="radio"
                                            name="tax_type"
                                            value="inclusive"
                                            checked={formData.tax_type === 'inclusive'}
                                            onChange={(e) => setFormData({ ...formData, tax_type: e.target.value })}
                                        />
                                        税込
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                        <input
                                            type="radio"
                                            name="tax_type"
                                            value="exclusive"
                                            checked={formData.tax_type === 'exclusive'}
                                            onChange={(e) => setFormData({ ...formData, tax_type: e.target.value })}
                                        />
                                        税抜
                                    </label>
                                </div>

                                {formData.tax_type === 'exclusive' && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>税率 (%)</label>
                                        <input
                                            type="number"
                                            placeholder="8"
                                            className="input-field"
                                            value={formData.tax_rate}
                                            onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                                {editingId ? '更新する' : '追加する'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
