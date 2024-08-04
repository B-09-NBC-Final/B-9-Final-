'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Step, Gender, DietGoal, InformationInsertDataType } from '@/types/infoReaserch';
import { Button } from '@/components/ui/button';
import { createClient } from '@/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useUserStore } from '@/store/userStore';
import Loading from '@/components/LoadingPage/Loading';

const supabase = createClient();

const InfoResearch = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [surveyData, setSurveyData] = useState<InformationInsertDataType>({
    year_of_birth: 0,
    gender: '',
    height: 0,
    weight: 0,
    purpose: ''
  });

  const [aiResults, setAiResults] = useState<{ result_diet: string; result_exercise: string }>({
    result_diet: '',
    result_exercise: ''
  });

  const steps: Step[] = ['출생년도', '성별', '신장 및 체중', '식단 목적'];
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
    if (name === 'weight' || name === 'height' || name === 'year_of_birth') {
      // 숫자만 허용하고, 빈 문자열이면 null로 설정함.
      const allowNumValue = value.replace(/[^0-9]/g, '');
      setSurveyData((prevData) => ({
        ...prevData,
        [name]: allowNumValue === '' ? null : Number(allowNumValue)
      }));
    } else {
      setSurveyData((prevData) => ({
        ...prevData,
        [name]: value
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
      throw error;
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



    let currentKey: keyof typeof exercise | null = null;

    lines.forEach((line) => {
      if (line.startsWith('운동종류:')) {
        exercise.type = line.substring(5).trim();
        currentKey = 'type';
      } else if (line.startsWith('운동방법:')) {
        exercise.method = line.substring(5).trim();
        currentKey = 'method';
      } else if (line.startsWith('운동 팁:')) {
        exercise.tip = line.substring(5).trim();
        currentKey = 'tip';
      } else if (line.startsWith('운동 횟수 및 시간:')) {
        exercise.duration = line.substring(11).trim();
        currentKey = 'duration';
      } else if (line.startsWith('운동의 영향:')) {
        exercise.effect = line.substring(7).trim();
        currentKey = 'effect';
      } else if (line.startsWith('주의사항:')) {
        exercise.caution = line.substring(5).trim();
        currentKey = 'caution';
      } else if (currentKey === 'method' && line.trim() !== '') {
        exercise.method += '\n' + line.trim();
      }
    });

    if (exercise.method.startsWith('\n')) {
      exercise.method = exercise.method.substring(1).trim();
    }

    return exercise;
  };

  const saveDataToSupabase = async () => {
    setIsLoading(true);
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
        setUser({ is_survey_done: true });
      }

      toast.success('데이터가 성공적으로 저장되었습니다!');
      router.push('/info-detail');
    } catch (error) {
      console.error('Error saving data:', error);
      toast.error('데이터 저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const isStepValid = (): boolean => {
    switch (steps[currentStepIndex]) {
      case '출생년도':
        return surveyData.year_of_birth !== null && /^19\d{2}$/.test(surveyData.year_of_birth.toString());
      case '성별':
        return !!surveyData.gender;
      case '신장 및 체중':
        return (
          surveyData.height !== null &&
          /^1\d{2}$/.test(surveyData.height.toString()) &&
          surveyData.weight !== null &&
          /^\d{2,3}$/.test(surveyData.weight.toString())
        );
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
          <div className=" max-w-md mx-auto bg-white rounded-md ">
            <h2 className="text-xl font-semibold mb-4 text-center">출생년도를 입력해주세요</h2>
            <p className="text-sm text-gray-600 mb-4 text-center">연령에 따라 일일 권장 칼로리 섭취량이 달라집니다</p>
            <br />
            <div className="mb-4">
              <label className="block text-sm mb-2 font-medium text-gray-700">출생년도</label>
              <input
                type="text"
                name="year_of_birth"
                placeholder="예) 19xx년"
                value={surveyData.year_of_birth ?? ''}
                onChange={handleInputChange}
                className="w-full p-3 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF7A85] focus:border-transparent"
              />
            </div>
          </div>
        );
      case '성별':
        return (
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-2 text-center">성별을 선택해 주세요</h2>
            <p className="text-sm text-gray-600 mb-6 text-center">성별에 따라 일일 권장 칼로리 섭취량이 달라집니다</p>

            <div className="flex w-3/4 space-x-3 gap-4 ">
              <button
                onClick={() => handleGenderSelect('남')}
                className={`flex-1 text-center w-full py-2 px-4 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-400 transition duration-200 ${
                  surveyData.gender === '남' ? 'bg-[#FFF6F2] text-black' : 'bg-white text-gray-700'
                }`}
              >
                남자
              </button>
              <button
                onClick={() => handleGenderSelect('여')}
                className={`flex-1 text-center w-full py-3 px-4 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400 transition duration-200 ${
                  surveyData.gender === '여' ? 'bg-[#FFF6F2] text-black' : 'bg-white text-gray-700'
                }`}
              >
                여자
              </button>
            </div>
          </div>
        );
      case '신장 및 체중':
        return (
          <div ref={stepRefs.current[2]} className="mb-4 flex flex-col justify-center items-center text-center">
            <h2 className="text-xl font-semibold mb-2 text-center">신장과 체중을 입력해주세요</h2>
            <p className="text-sm text-gray-600 mb-10 text-center">신장과 체중에 따라 일일 권장 칼로리 섭취량이 달라집니다</p>
            <div className="mb-4 w-full  ">
              <label className="w-60 block text-sm mb-2 font-medium text-gray-700">신장</label>
              <input
                type="text"
                name="height"
                placeholder="cm (예: 170)"
                value={surveyData.height ?? ''}
                onChange={handleInputChange}
                className="w-2/3 p-3 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF7A85] focus:border-transparent"
              />
              {surveyData.height && !/^1\d{2}$/.test(surveyData.height.toString()) && (
                <p className="text-red-500 text-sm mt-1">1xx 형식으로 입력해주세요.</p>
              )}
            </div>
            <div className="mb-4 w-full  ">
              <label className=" w-60 block text-sm mb-2 font-medium text-gray-700">체중</label>
              <input
                type="text"
                name="weight"
                placeholder="kg (예: 65)"
                value={surveyData.weight ?? ''}
                onChange={handleInputChange}
               className="w-2/3 p-3 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF7A85] focus:border-transparent"
              />
              {surveyData.weight && !/^\d{2,3}$/.test(surveyData.weight.toString()) && (
                <p className="text-red-500 text-sm mt-1">2자리 또는 3자리 숫자로 입력해주세요.</p>
              )}
            </div>
          </div>
        );
      case '식단 목적':
        return (
          <div ref={stepRefs.current[4]} className="mb-4">
             <h2 className="text-xl font-semibold mb-2 text-center">식단을 통해 이루고자 하는 목표를 알려주세요</h2>
             <p className="text-sm text-gray-600 mb-10 text-center">선택한 목표에 가장 최적화된 식단과 운동을 추천해 드려요</p>
            <div className="flex flex-col justify-center items-center gap-4">
              {(['체중 감량', '체중 유지', '체중 증량'] as DietGoal[]).map((goal) => (
                <button
                  key={goal}
                  onClick={() => handleDietGoalSelect(goal)}
                  className={`w-80 flex h-12 items-center text-center justify-center py-3 px-4 text-base border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-red-400 transition duration-200 ${
                    surveyData.purpose === goal ? 'bg-[#FFF6F2] text-black' : 'bg-white text-gray-700'
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
    <>
      {isLoading && <Loading />}
      <div
        className={`w-[1360px] max-w-2xl flex flex-col item-center  mx-auto mt-10 mb-4 p-8  bg-white rounded-xl shadow-lg ${
          isLoading ? 'opacity-50' : ''
        }`}
      >
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">{steps[currentStepIndex]}</h1>
        <div className="mb-8 bg-gray-200 rounded-full h-2">
          <div
            className="bg-red-400 h-2 rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          ></div>
        </div>

        {renderStep()}

        <div className="mt-36 flex items-center justify-center ">
          {currentStepIndex > 0 && (
            <Button
              onClick={preStep}
              className="flex w-56 h-12 items-center justify-center py-3 text-lg text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 transition duration-200"
            >
              이전
            </Button>
          )}
          {currentStepIndex < steps.length - 1 ? (
            <Button
              onClick={nextStep}
              disabled={!isStepValid()}
              className="flex w-56 h-12 ml-14 items-center  bg-[#FF7A85] text-white py-3 rounded-lg hover:bg-[#FF7A85] transition duration-300"
            >
              다음
            </Button>
          ) : (
            <Button
              onClick={saveDataToSupabase}
              disabled={!isStepValid()}
              className="flex w-56 h-12 ml-14 items-center  bg-[#FF7A85] text-white py-3 rounded-lg hover:bg-[#FF7A85] transition duration-300"
            >
              결과보기
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

export default InfoResearch;
