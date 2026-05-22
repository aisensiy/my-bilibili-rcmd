const REPO_URL = 'https://github.com/aisensiy/my-bilibili-rcmd'
const ISSUES_URL = `${REPO_URL}/issues`
const STORE_URL = 'https://chromewebstore.google.com/detail/fbjfocpchadnanfkiecekebmopfjlpee'

export default function AboutSection() {
  const version = chrome.runtime.getManifest().version

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="text-xs font-semibold text-gray-400 mb-1.5">关于</div>
      <div className="text-[11px] text-gray-500 mb-1.5">
        版本 <span className="font-mono text-gray-600">{version}</span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-bili-blue">
          项目主页 →
        </a>
        <a href={ISSUES_URL} target="_blank" rel="noreferrer" className="text-bili-blue">
          反馈问题 →
        </a>
        <a href={STORE_URL} target="_blank" rel="noreferrer" className="text-bili-blue">
          给个好评 →
        </a>
      </div>
    </div>
  )
}
