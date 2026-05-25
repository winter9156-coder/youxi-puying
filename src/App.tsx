import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import ClassStats from './pages/ClassStats';
import Login from './pages/Login';
// 幼析
import ObservationList from './pages/observation/ObservationList';
import NewObservation from './pages/observation/NewObservation';
import AnalysisReport from './pages/observation/AnalysisReport';
// 育见
import StrategyList from './pages/education/StrategyList';
import StrategyGenerator from './pages/education/StrategyGenerator';
import SharedThinking from './pages/education/SharedThinking';
import PBLDesigner from './pages/education/PBLDesigner';
import ThemeCourseDesigner from './pages/education/ThemeCourseDesigner';
// 协同共育
import CooperationHome from './pages/cooperation/CooperationHome';
import Simulator from './pages/cooperation/Simulator';
import CommunicationAssistant from './pages/cooperation/CommunicationAssistant';
// 幼儿档案
import ChildList from './pages/archive/ChildList';
import ChildDetail from './pages/archive/ChildDetail';
// 数据管理
import DataManagement from './pages/DataManagement';
// 观师荐策
import TeacherRecommend from './pages/TeacherRecommend';

function App() {
  return (
    <HashRouter>
      <Routes>
        {/* 登录页（无侧边栏） */}
        <Route path="/登录" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          {/* 幼析 */}
          <Route path="/幼析" element={<ObservationList />} />
          <Route path="/幼析/新建" element={<NewObservation />} />
          <Route path="/幼析/分析/:id" element={<AnalysisReport />} />
          {/* 育见 */}
          <Route path="/育见" element={<StrategyList />} />
          <Route path="/育见/策略" element={<StrategyGenerator />} />
          <Route path="/育见/思维共享" element={<SharedThinking />} />
          <Route path="/育见/pbl" element={<PBLDesigner />} />
          <Route path="/育见/主题课程" element={<ThemeCourseDesigner />} />
          {/* 协同共育 */}
          <Route path="/协同共育" element={<CooperationHome />} />
          <Route path="/协同共育/模拟器" element={<Simulator />} />
          <Route path="/协同共育/沟通助手" element={<CommunicationAssistant />} />
          {/* 幼儿档案 */}
          <Route path="/幼儿档案" element={<ChildList />} />
          <Route path="/幼儿档案/:id" element={<ChildDetail />} />
          {/* 设置 */}
          <Route path="/设置" element={<Settings />} />
          {/* 数据管理（仅王洋洋可见） */}
          <Route path="/数据管理" element={<DataManagement />} />
          {/* 观师荐策（所有管理员可见） */}
          <Route path="/观师荐策" element={<TeacherRecommend />} />
          {/* 班级统计 */}
          <Route path="/班级统计" element={<ClassStats />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
