// Loading skeleton — hiển thị NGAY khi click menu, trong khi server đang fetch data
export default function Loading() {
  return (
    <div className="flex-1 p-6 h-[calc(100vh-64px)] overflow-hidden bg-gray-50 flex flex-col animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-48 bg-gray-200 rounded-lg mb-2" />
          <div className="h-4 w-64 bg-gray-100 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-gray-200 rounded-lg" />
          <div className="h-9 w-28 bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex-1 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-4 gap-px bg-gray-100 border-b border-gray-200 p-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded" />
          ))}
        </div>
        {/* Table rows */}
        <div className="divide-y divide-gray-100">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="grid grid-cols-4 gap-4 p-4">
              <div className="h-4 bg-gray-100 rounded col-span-1" style={{ width: `${60 + Math.random() * 30}%` }} />
              <div className="h-4 bg-gray-100 rounded" style={{ width: `${40 + Math.random() * 40}%` }} />
              <div className="h-4 bg-gray-100 rounded" style={{ width: `${30 + Math.random() * 50}%` }} />
              <div className="flex gap-2">
                <div className="h-7 w-16 bg-gray-100 rounded-md" />
                <div className="h-7 w-16 bg-gray-100 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
