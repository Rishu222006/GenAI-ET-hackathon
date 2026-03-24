"use client";

import React, { useState } from "react";
import Header from "../components/Header";
import RepoUpload from "../components/RepoUpload";
import AnalysisResult from "../components/AnalysisResult";

const Home: React.FC = () => {
  const [repoId, setRepoId] = useState<string | null>(null);

  return (
    <div>
      <Header />
      <div style={{ padding: 20 }}>
        <h2>Upload Repository for AI Analysis</h2>
        <RepoUpload onUploaded={setRepoId} />
        {repoId && <AnalysisResult repoId={repoId} />}
      </div>
    </div>
  );
};

export default Home;