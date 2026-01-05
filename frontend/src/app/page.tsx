import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen container">
      <header className="mb-8 mt-4 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2" style={{ fontSize: '1.8rem' }}>
          原価計算女王
        </h1>
        <p className="text-gray-500 text-sm">
          ベーカリー向け 原価管理＆レシピ計算システム
        </p>
      </header>

      <div className="grid-responsive">
        <Link href="/ingredients" className="card group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem' }}>🥦</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>材料管理</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            小麦粉、バターなどの仕入れ価格を登録・管理します。
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '1rem', color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '0.9rem' }}>
            開く &rarr;
          </div>
        </Link>

        <Link href="/recipes" className="card group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem' }}>🥖</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>レシピ計算</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            材料を選んでレシピを作成。原価をリアルタイムで自動計算します。
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '1rem', color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '0.9rem' }}>
            開く &rarr;
          </div>
        </Link>
      </div>
    </main>
  );
}
