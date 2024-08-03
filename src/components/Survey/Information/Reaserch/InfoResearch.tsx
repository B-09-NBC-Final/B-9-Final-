'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Step, Gender, DietGoal, InformationInsertDataType } from '@/types/infoReaserch';
import { Button } from '@/components/ui/button';
import { createClient } from '@/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useUserStore } from '@/store/userStore';

const supabase = createClient();

const InfoResearch = (): JSX.Element => {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [surveyData, setSurveyData] = useState<InformationInsertDataType>({
    gender: '',
    height: null,
    weight: null,
    purpose: '',
    year_of_birth: null
  });

  const [aiResults, setAiResults] = useState<{ result_diet: string; result_exercise: string }>({
    result_diet: '',
    result_exercise: ''
  });

  const steps: Step[] = ['출생년도', '성별', '신장', '체중', '식단 목적'];
  const stepRefs = useRef<React.RefObject<HTMLDivElement>[]>(steps.map(() => React.createRef()));

  const nextStep = (): void => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const preStep = (): void => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'weight') {
      // 숫자만 허용하고, 빈 문자열이면 null로 설정함.
      const numericValue = value.replace(/[^0-9]/g, '');
      setSurveyData((prevData) => ({
        ...prevData,
        [name]: numericValue === '' ? null : Number(numericValue)
      }));
    } else {
      setSurveyData((prevData) => ({
        ...prevData,
        [name]: ['height', 'year_of_birth'].includes(name) ? (value === '' ? null : Number(value)) : value
      }));
    }
  };

  const handleGenderSelect = (gender: Gender): void => {
    if (!gender) return;
    setSurveyData((prevData) => ({ ...prevData, gender }));
  };

  const handleDietGoalSelect = (purpose: DietGoal): void => {
    if (!purpose) return;
    setSurveyData((prevData) => ({ ...prevData, purpose }));
  };

  useEffect(() => {
    stepRefs.current[currentStepIndex].current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }, [currentStepIndex]);

  const handleClickAPICall = async () => {
    try {
      const response = await fetch('/api/gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(surveyData)
      });
      if (!response.ok) {
        throw new Error('Api 요청에 실패하였습니다.');
      }
      const content = await response.json();
      return content.data;
    } catch (error) {
      console.error('Api 요청 중 오류:', error);
      toast.error('오류가 발생했습니다. 다시 시도해주세요!');
      throw error;  // 에러를 다시 throw하여 상위에서 처리할 수 있게 함
    }
  };

  const parseAiResults = (result: string) => {
    if (!result) return null;

    const days = result.split('@').slice(1);
    const dietPlans = days.map((day) => parseDiet(day));
    const exercise = parseExercise(days[0].split('~추천운동')[1]);

    return {
      result_diet: JSON.stringify(dietPlans),
      result_exercise: JSON.stringify(exercise)
    };
  };

  const parseDiet = (dayString: string) => {
    const sections = dayString.split('\n');
    const diet = {
      day: '',
      breakfast: { menu: '', ratio: '', calories: '' },
      lunch: { menu: '', ratio: '', calories: '' },
      dinner: { menu: '', ratio: '', calories: '' },
      totalCalories: ''
    };

    let currentMeal = null;

    sections.forEach((line) => {
      if (line.startsWith('@')) diet.day = line.substring(1).trim();
      else if (line.startsWith('#')) {
        currentMeal = diet.breakfast;
        if (line.startsWith('#?메뉴:')) currentMeal.menu += line.substring(7).trim() + '\n';
        else if (line.startsWith('#-')) currentMeal.menu += line.substring(1).trim() + '\n';
        else if (line.startsWith('#$')) currentMeal.ratio = line.substring(1).trim();
        else if (line.startsWith('#&')) currentMeal.calories = line.substring(1).trim();
      } else if (line.startsWith('^')) {
        currentMeal = diet.lunch;
        if (line.startsWith('^?메뉴:')) currentMeal.menu += line.substring(7).trim() + '\n';
        else if (line.startsWith('^-')) currentMeal.menu += line.substring(1).trim() + '\n';
        else if (line.startsWith('^$')) currentMeal.ratio = line.substring(1).trim();
        else if (line.startsWith('^&')) currentMeal.calories = line.substring(1).trim();
      } else if (line.startsWith('!')) {
        currentMeal = diet.dinner;
        if (line.startsWith('!?메뉴:')) currentMeal.menu += line.substring(7).trim() + '\n';
        else if (line.startsWith('!-')) currentMeal.menu += line.substring(1).trim() + '\n';
        else if (line.startsWith('!$')) currentMeal.ratio = line.substring(1).trim();
        else if (line.startsWith('!&')) currentMeal.calories = line.substring(1).trim();
      } else if (line.startsWith('*')) diet.totalCalories = line.substring(1).trim();
    });

    return diet;
  };

  const parseExercise = (exerciseString: string) => {
    if (!exerciseString) return null;
    const lines = exerciseString.split('\n');
    const exercise = {
      type: '',
      method: '',
      tip: '',
      duration: '',
      effect: '',
      caution: ''
    };

    lines.forEach((line) => {
      if (line.startsWith('운동종류:')) exercise.type = line.substring(5).trim();
      else if (line.startsWith('운동방법:')) exercise.method = line.substring(5).trim();
      else if (line.startsWith('운동 팁:')) exercise.tip = line.substring(5).trim();
      else if (line.startsWith('운동 횟수 및 시간:')) exercise.duration = line.substring(11).trim();
      else if (line.startsWith('운동의 영향:')) exercise.effect = line.substring(7).trim();
      else if (line.startsWith('주의사항:')) exercise.caution = line.substring(5).trim();
    });

    return exercise;
  };

  const saveDataToSupabase = async () => {
    try {
      const aiResults = await handleClickAPICall();
      const parsedResults = parseAiResults(aiResults);
  
      if (!parsedResults) {
        throw new Error('AI 결과 파싱에 실패했습니다.');
      }
  
      const { data, error } = await supabase.from('information').insert({
        year_of_birth: surveyData.year_of_birth,
        weight: surveyData.weight,
        gender: surveyData.gender,
        height: surveyData.height,
        purpose: surveyData.purpose,
        result_diet: parsedResults.result_diet,
        result_exercise: parsedResults.result_exercise
      });
  
      if (error) throw error;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .update({ is_survey_done: true })
        .eq('user_id', user!.userId)
        .select();

      if (userError) throw userError;

      if (userData && userData.length > 0) {
        setUser({ is_survey_done: true });      }

      toast.success('데이터가 성공적으로 저장되었습니다!');
      router.push('/info-detail');
    } catch (error) {
      console.error('Error saving data:', error);
      toast.error('데이터 저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
  };

  const isStepValid = (): boolean => {
    switch (steps[currentStepIndex]) {
      case '출생년도':
        return surveyData.year_of_birth !== null && /^19\d{2}$/.test(surveyData.year_of_birth.toString());
      case '성별':
        return !!surveyData.gender;
      case '신장':
        return surveyData.height !== null && /^1\d{2}$/.test(surveyData.height.toString());
      case '체중':
        return surveyData.weight !== null && /^\d{2,3}$/.test(surveyData.weight.toString());
      case '식단 목적':
        return !!surveyData.purpose;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (steps[currentStepIndex]) {
      case '출생년도':
        return (
          <div ref={stepRefs.current[0]} className="mb-4">
            <label className="block text-sm mb-2 font-medium text-gray-700">출생년도</label>
            <input
              type="text"
              name="year_of_birth"
              placeholder="예) 1990"
              value={surveyData.year_of_birth ?? ''}
              onChange={handleInputChange}
              className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
            />
            {surveyData.year_of_birth && !/^19\d{2}$/.test(surveyData.year_of_birth.toString()) && (
              <p className="text-red-500 text-sm mt-1">19xx 형식으로 입력해주세요.</p>
            )}
          </div>
        );
      case '성별':
        return (
          <div ref={stepRefs.current[1]} className="mb-4">
            <label className="block text-sm mb-2 font-medium text-gray-700">성별</label>
            <div className="flex space-x-4">
              <button
                onClick={() => handleGenderSelect('남')}
                className={`flex-1 py-2 px-4 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400 transition duration-200 ${
                  surveyData.gender === '남' ? 'bg-red-400 text-white' : 'bg-white text-gray-700'
                }`}
              >
                남자
              </button>
              <button
                onClick={() => handleGenderSelect('여')}
                className={`flex-1 py-2 px-4 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400 transition duration-200 ${
                  surveyData.gender === '여' ? 'bg-red-400 text-white' : 'bg-white text-gray-700'
                }`}
              >
                여자
              </button>
            </div>
          </div>
        );
      case '신장':
        return (
          <div ref={stepRefs.current[2]} className="mb-4">
            <label className="block text-sm mb-2 font-medium text-gray-700">신장</label>
            <input
              type="text"
              name="height"
              placeholder="cm (예: 170)"
              value={surveyData.height ?? ''}
              onChange={handleInputChange}
              className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
            />
            {surveyData.height && !/^1\d{2}$/.test(surveyData.height.toString()) && (
              <p className="text-red-500 text-sm mt-1">1xx 형식으로 입력해주세요.</p>
            )}
          </div>
        );
      case '체중':
        return (
          <div ref={stepRefs.current[3]} className="mb-4">
            <label className="block text-sm mb-2 font-medium text-gray-700">체중</label>
            <input
              type="text"
              name="weight"
              placeholder="kg (예: 65)"
              value={surveyData.weight ?? ''}
              onChange={handleInputChange}
              className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
            />
            {surveyData.weight && !/^\d{2,3}$/.test(surveyData.weight.toString()) && (
              <p className="text-red-500 text-sm mt-1">2자리 또는 3자리 숫자로 입력해주세요.</p>
            )}
          </div>
        );
      case '식단 목적':
        return (
          <div ref={stepRefs.current[4]} className="mb-4">
            <p className="text-lg mb-4 font-medium text-gray-700">식단을 통해 이루고자 하는 목표를 입력해주세요</p>
            <div className="grid grid-cols-1 gap-2">
              {(['체중 감량', '체중 유지', '체중 증량'] as DietGoal[]).map((goal) => (
                <button
                  key={goal}
                  onClick={() => handleDietGoalSelect(goal)}
                  className={`py-2 px-4 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400 transition duration-200 ${
                    surveyData.purpose === goal ? 'bg-red-400 text-white' : 'bg-white text-gray-700'
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 mb-4 p-8 bg-white rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">{steps[currentStepIndex]}</h1>
      <div className="mb-8 bg-gray-200 rounded-full h-2">
        <div
          className="bg-red-400 h-2 rounded-full transition-all duration-500 ease-in-out"
          style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
        ></div>
      </div>

      {renderStep()}

      <div className="mt-8 flex justify-between">
        {currentStepIndex > 0 && (
          <Button
            onClick={preStep}
            className="py-3 px-6 text-lg text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition duration-200"
          >
            이전
          </Button>
        )}
        {currentStepIndex < steps.length - 1 ? (
          <Button
            onClick={nextStep}
            disabled={!isStepValid()}
            className="py-3 px-6 text-lg bg-red-400 text-white rounded-lg hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 transition duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            다음
          </Button>
        ) : (
          <Button
            onClick={saveDataToSupabase}
            disabled={!isStepValid()}
            className="py-3 px-6 text-lg bg-red-400 text-white rounded-lg hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 transition duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            결과보기
          </Button>
        )}
      </div>
    </div>
  );
};

export default InfoResearch;
